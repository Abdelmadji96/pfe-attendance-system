"""RC522 RFID reader — BCM GPIO + SPI auto-probe (Pi 4/5)."""

from __future__ import annotations

import glob
import time
from dataclasses import dataclass
from typing import Any

# Standard RC522 wiring: RST → physical pin 22 → GPIO 25 (BCM)
RC522_RST_BCM = 25
VERSION_REG = 0x37
VALID_CHIP_VERSIONS = frozenset({0x88, 0x90, 0x91, 0x92, 0xB2})
SPI_SPEEDS_HZ = (1_000_000, 500_000, 250_000)


@dataclass(frozen=True, slots=True)
class SpiProbeResult:
    bus: int
    device: int
    speed_hz: int
    version: int | None
    ok: bool
    error: str | None = None

    @property
    def label(self) -> str:
        if self.error:
            return f"spidev{self.bus}.{self.device} @ {self.speed_hz}Hz — error: {self.error}"
        version_hex = "?" if self.version is None else f"0x{self.version:02X}"
        status = "OK" if self.ok else "bad version (SPI not talking to RC522)"
        return f"spidev{self.bus}.{self.device} @ {self.speed_hz}Hz — version {version_hex} — {status}"


def ensure_bcm_gpio() -> None:
    """BCM + Pi 5 setup patch (must run before mfrc522 import)."""
    from gate.hardware.gpio_platform import ensure_gpio

    ensure_gpio()


def list_spidev_devices() -> list[tuple[int, int]]:
    devices: list[tuple[int, int]] = []
    for path in sorted(glob.glob("/dev/spidev*")):
        suffix = path.removeprefix("/dev/spidev")
        if "." not in suffix:
            continue
        bus_s, dev_s = suffix.split(".", 1)
        try:
            devices.append((int(bus_s), int(dev_s)))
        except ValueError:
            continue
    return devices


def _open_mfrc522_core(bus: int, device: int, speed_hz: int) -> Any:
    from gate.hardware.gpio_platform import ensure_gpio, release_gpio_pins

    GPIO = ensure_gpio()
    release_gpio_pins(RC522_RST_BCM)
    from mfrc522 import MFRC522  # noqa: E402 — GPIO patch must run first

    return MFRC522(
        bus=bus,
        device=device,
        spd=speed_hz,
        pin_mode=GPIO.BCM,
        pin_rst=RC522_RST_BCM,
    )


def _close_mfrc522_spi(mfrc: Any) -> None:
    """Close SPI and release RC522 RST (GPIO25) so the next probe can run on Pi 5."""
    from gate.hardware.gpio_platform import release_gpio_pins

    try:
        mfrc.spi.close()
    except Exception:
        pass
    release_gpio_pins(RC522_RST_BCM)


def chip_version(mfrc: Any) -> int:
    return int(mfrc.Read_MFRC522(VERSION_REG))


def probe_spi_device(bus: int, device: int) -> SpiProbeResult | None:
    """Return first working speed for this spidev node, or last failed attempt."""
    last: SpiProbeResult | None = None
    for speed_hz in SPI_SPEEDS_HZ:
        mfrc = None
        try:
            mfrc = _open_mfrc522_core(bus, device, speed_hz)
            version = chip_version(mfrc)
            result = SpiProbeResult(
                bus=bus,
                device=device,
                speed_hz=speed_hz,
                version=version,
                ok=version in VALID_CHIP_VERSIONS,
            )
            last = result
            if result.ok:
                return result
        except Exception as exc:
            last = SpiProbeResult(
                bus=bus,
                device=device,
                speed_hz=speed_hz,
                version=None,
                ok=False,
                error=str(exc),
            )
        finally:
            if mfrc is not None:
                _close_mfrc522_spi(mfrc)
    return last


def probe_all_spi(*, preferred: tuple[int, int] | None = None) -> list[SpiProbeResult]:
    """Probe every /dev/spidev* node (preferred pair first)."""
    nodes = list_spidev_devices()
    if not nodes:
        nodes = [(0, 0), (10, 0)]

    ordered: list[tuple[int, int]] = []
    if preferred is not None:
        ordered.append(preferred)
    for node in nodes:
        if node not in ordered:
            ordered.append(node)

    results: list[SpiProbeResult] = []
    seen: set[tuple[int, int]] = set()
    for bus, device in ordered:
        if (bus, device) in seen:
            continue
        seen.add((bus, device))
        result = probe_spi_device(bus, device)
        if result is not None:
            results.append(result)
    return results


def find_working_reader(
    preferred_bus: int,
    preferred_device: int,
) -> tuple[Any, int, int, int] | None:
    """Return (MFRC522 core, bus, device, speed_hz) — reader left open on success."""
    nodes = list_spidev_devices()
    if not nodes:
        nodes = [(0, 0), (10, 0)]

    ordered: list[tuple[int, int]] = []
    preferred = (preferred_bus, preferred_device)
    ordered.append(preferred)
    for node in nodes:
        if node not in ordered:
            ordered.append(node)

    seen: set[tuple[int, int]] = set()
    for bus, device in ordered:
        if (bus, device) in seen:
            continue
        seen.add((bus, device))
        for speed_hz in SPI_SPEEDS_HZ:
            mfrc = None
            try:
                mfrc = _open_mfrc522_core(bus, device, speed_hz)
                version = chip_version(mfrc)
                if version in VALID_CHIP_VERSIONS:
                    return mfrc, bus, device, speed_hz
                _close_mfrc522_spi(mfrc)
                mfrc = None
            except Exception:
                if mfrc is not None:
                    _close_mfrc522_spi(mfrc)
                    mfrc = None
    return None


def find_working_spi(
    preferred_bus: int,
    preferred_device: int,
) -> tuple[int, int, int] | None:
    """Return (bus, device, speed_hz) for the first RC522 that responds, or None."""
    found = find_working_reader(preferred_bus, preferred_device)
    if found is None:
        return None
    mfrc, bus, device, speed_hz = found
    _close_mfrc522_spi(mfrc)
    return bus, device, speed_hz


def shutdown_reader(reader: Any) -> None:
    """Release RC522 SPI + RST GPIO when done (e.g. after --test-rfid)."""
    core = getattr(reader, "READER", None)
    if core is not None:
        _close_mfrc522_spi(core)


def print_spi_diagnosis(preferred_bus: int, preferred_device: int) -> int:
    """Print SPI probe table; exit 0 if any node has a valid RC522 version."""
    nodes = list_spidev_devices()
    print("RC522 SPI diagnosis")
    print(f"  Preferred from .env: SPI_BUS={preferred_bus} SPI_DEVICE={preferred_device}")
    print(f"  /dev/spidev* nodes: {', '.join(f'spidev{b}.{d}' for b, d in nodes) or '(none)'}")
    print(f"  RC522 wiring: SDA→pin24, SCK→23, MOSI→19, MISO→21, RST→pin22, VCC→3.3V")
    print()

    results = probe_all_spi(preferred=(preferred_bus, preferred_device))
    if not results:
        print("ERROR: No SPI devices to probe. Enable SPI: sudo raspi-config → Interface Options → SPI")
        return 1

    working: SpiProbeResult | None = None
    for result in results:
        print(f"  {result.label}")
        if result.ok and working is None:
            working = result

    print()
    if working is None:
        print("FAIL: RC522 not detected on any SPI bus.")
        print("  • Version should be 0x91 or 0x92 — 0x00/0xFF means bad wiring or wrong bus")
        print("  • Check 3.3V (not 5V), all 6 wires, card 1–3 cm from antenna")
        print("  • Run: ls -l /dev/spidev*  (user must be in group spi)")
        print("  • Pi 5 GPIO errors: run ./fix-pi5-gpio.sh; check RST pin: pinctrl get 25")
        print("  • 'GPIO busy' on RST (GPIO25): stop gate service / reboot, then retry")
        return 1

    if (working.bus, working.device) != (preferred_bus, preferred_device):
        print(
            f"NOTE: Working bus is {working.bus}/{working.device}, "
            f"but .env has SPI_BUS={preferred_bus}. Update .env:"
        )
        print(f"  SPI_BUS={working.bus}")
        print(f"  SPI_DEVICE={working.device}")

    print(f"OK: RC522 found on spidev{working.bus}.{working.device} (version 0x{working.version:02X})")
    return 0


def _gpio_busy_hint(results: list[SpiProbeResult]) -> str:
    if not any(r.error and "busy" in r.error.lower() for r in results):
        return ""
    return (
        "\n  GPIO busy on RC522 reset (GPIO25) — another process owns the pin.\n"
        "  Fix on Pi:\n"
        "    sudo systemctl stop pfe-gate pfe-admin\n"
        "    sudo systemctl disable pfe-gate pfe-admin   # if testing manually\n"
        "    pkill -f gate_attendance.py\n"
        "    ./start-gate.sh\n"
        "  Use EITHER 'sudo systemctl enable --now pfe-gate' OR './start-gate.sh', not both."
    )


def create_mfrc522_reader(
    spi_bus: int,
    spi_device: int,
    *,
    auto_probe: bool = True,
) -> tuple[Any, tuple[int, int, int]]:
    """
    Build SimpleMFRC522. Returns (reader, (bus, device, speed_hz) actually used).
    Auto-probes all spidev nodes when the configured bus has no valid chip version.
    """
    from mfrc522 import SimpleMFRC522

    if auto_probe:
        found = find_working_reader(spi_bus, spi_device)
        if found is None:
            results = probe_all_spi(preferred=(spi_bus, spi_device))
            detail = "\n  ".join(r.label for r in results) if results else "(no /dev/spidev* — enable SPI)"
            raise RuntimeError(
                f"RC522 not found (configured SPI_BUS={spi_bus} SPI_DEVICE={spi_device}).\n"
                f"  SPI probe:\n  {detail}\n"
                "  Fix: python3 admin_enrollment.py --test-rfid\n"
                "  If probe shows OK on spidev0.0, set in .env: SPI_BUS=0 SPI_DEVICE=0"
                f"{_gpio_busy_hint(results)}"
            )
        mfrc, bus, device, speed_hz = found
    else:
        ensure_bcm_gpio()
        bus, device, speed_hz = spi_bus, spi_device, SPI_SPEEDS_HZ[0]
        mfrc = _open_mfrc522_core(bus, device, speed_hz)
        version = chip_version(mfrc)
        if version not in VALID_CHIP_VERSIONS:
            _close_mfrc522_spi(mfrc)
            raise RuntimeError(
                f"RC522 SPI open on bus {bus}/{device} but chip version 0x{version:02X} "
                f"(expected 0x91/0x92). Check wiring and 3.3V power."
            )

    reader = object.__new__(SimpleMFRC522)
    reader.READER = mfrc
    return reader, (bus, device, speed_hz)


def read_uid_blocking(reader: Any) -> str:
    """Block until a card UID is read (poll loop with small sleep)."""
    while True:
        uid = read_uid_once(reader)
        if uid:
            return uid
        time.sleep(0.05)


def read_uid_once(reader: Any) -> str | None:
    """Non-blocking single poll; returns UID or None."""
    card_id = reader.read_id_no_block()
    if card_id is None:
        return None
    return str(card_id).strip().upper()


def run_rfid_poll_test(spi_bus: int, spi_device: int, *, seconds: float = 30.0) -> int:
    """SPI diagnose, then wait for one card scan."""
    code = print_spi_diagnosis(spi_bus, spi_device)
    if code != 0:
        return code

    try:
        reader, (bus, device, _speed) = create_mfrc522_reader(
            spi_bus, spi_device, auto_probe=True
        )
    except Exception as exc:
        print(f"ERROR: RC522 init failed: {exc}")
        return 1

    try:
        version = chip_version(reader.READER)
        print()
        print(
            f"Polling spidev{bus}.{device} (chip 0x{version:02X}, RST=GPIO{RC522_RST_BCM}) "
            f"for {seconds:.0f}s..."
        )
        print("Hold card flat, 1–3 cm from the reader.")
        print()

        deadline = time.monotonic() + seconds
        dots = 0
        while time.monotonic() < deadline:
            uid = read_uid_once(reader)
            if uid:
                print(f"Card detected: {uid}")
                return 0
            dots += 1
            if dots % 200 == 0:
                print("  still polling...")
            time.sleep(0.05)

        print("No card detected (SPI OK — problem is antenna/card placement or card type).")
        return 1
    finally:
        shutdown_reader(reader)

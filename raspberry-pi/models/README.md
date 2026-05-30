# ML models (same layout as `attendanceSystem`)

These files come from **`models.rar`** and **`silent_face.rar`** in your Downloads folder.

## Directory layout

```
models/
├── silent_face/                          ← from silent_face.rar
│   ├── 2.7_80x80_MiniFASNetV2.onnx
│   ├── 2.7_80x80_MiniFASNetV2.onnx.data
│   ├── 4_0_0_80x80_MiniFASNetV1SE.onnx
│   └── 4_0_0_80x80_MiniFASNetV1SE.onnx.data
├── Silent-Face-Anti-Spoofing-master/     ← crop/bbox utils for ONNX anti-spoof
│   └── src/generate_patches.py, utility.py, ...
└── facenet.tflite                        ← bundled FaceNet (keras-facenet used at runtime)
```

## Install

**Option A — copy with the repo (already extracted on dev machine):**
```bash
scp -r raspberry-pi admin@192.168.1.10:~/
```

**Option B — extract from RAR on the Pi:**
```bash
cd ~/raspberry-pi
chmod +x install_models.sh
./install_models.sh ~/Downloads/models.rar
```

## Used by

| Model | Script | Purpose |
|-------|--------|---------|
| `silent_face/*.onnx` | `gate/core/anti_spoof.py` | Liveness / anti-spoof at gate |
| `Silent-Face-Anti-Spoofing-master/` | `gate/core/anti_spoof.py` | Face crop patches for ONNX |
| `keras-facenet` (pip) | `gate/core/face_verifier.py` | 512-d face embeddings |
| `facenet.tflite` | Reserved | Same project bundle; runtime uses keras-facenet |

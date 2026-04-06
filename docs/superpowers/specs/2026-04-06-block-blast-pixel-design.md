# Block Blast Pixel — Game Design Spec

## Overview

Game xep hinh kieu Block Blast voi phong cach pixel art 8-bit. Chay tren web browser, su dung Canvas 2D, vanilla JS, khong framework.

## 1. Cau truc file

```
GAME XEP HINH/
├── index.html          # Entry point
├── css/
│   └── style.css       # UI styling (menu, overlays, buttons)
├── js/
│   ├── main.js         # Khoi tao game, game loop
│   ├── board.js        # Luoi 8x8, logic dat khoi, xoa hang/cot
│   ├── pieces.js       # Dinh nghia cac khoi hinh + random spawn
│   ├── renderer.js     # Ve Canvas (board, pieces, effects, pixel art)
│   ├── input.js        # Xu ly keo tha (mouse + touch)
│   ├── score.js        # Diem, combo, streak, high score
│   ├── audio.js        # Sound effects + nhac nen
│   ├── modes.js        # Che do choi (classic, time attack, daily)
│   └── storage.js      # LocalStorage (high scores, leaderboard, settings)
├── assets/
│   ├── sprites/        # Pixel art sprites cho cac khoi
│   ├── sounds/         # Sound effects (.wav/.mp3)
│   └── music/          # Nhac nen chiptune
└── docs/
    └── superpowers/
        └── specs/      # Design doc
```

## 2. Gameplay Core

### Luoi (Board)
- Mang 2D kich thuoc 8x8
- Moi o luu trang thai: trong (0) hoac mau khoi (1-7)
- Sau moi lan dat khoi, scan toan bo 8 hang + 8 cot
- Hang/cot nao day thi xoa dong thoi

### Cac khoi hinh (Pieces)
- Moi luot sinh 3 khoi ngau nhien o khu vuc ben duoi luoi
- Pool khoi gom ~15-20 hinh dang:
  - Don: 1x1, 1x2, 1x3, 1x4, 1x5
  - Vuong: 2x2, 3x3
  - Chu L: 2x3, 3x2 (va cac bien the xoay)
  - Chu T, Z, S (Tetris-like)
- Khoi KHONG xoay duoc (giong Block Blast goc)
- Moi khoi co 1 trong 7 mau pixel art

### Dat khoi
- Keo khoi tu khu vuc spawn len luoi
- Khi keo, hien thi preview (bong mo) vi tri se dat
- Chi dat duoc neu tat ca o cua khoi deu trong
- Sau khi dat xong 3 khoi hoac khong con cho dat cho khoi nao → spawn 3 khoi moi

### Game Over
- Khi khong co khoi nao trong 3 khoi hien tai co the dat vao bat ky vi tri nao tren luoi

## 3. He thong diem va Combo

### Diem co ban
- Dat khoi: +10 diem moi o (khoi 3 o = 30 diem)
- Xoa 1 hang hoac cot: +100 diem

### Combo (xoa nhieu hang/cot cung luc)
- 1 line: x1 (100)
- 2 lines: x3 (600)
- 3 lines: x5 (1500)
- 4+ lines: x8 (3200+)

### Streak (xoa lien tiep nhieu luot)
- Moi lan dat khoi ma co xoa hang/cot → streak +1
- Streak bonus: streak x 50 diem thuong them
- Dat khoi ma khong xoa gi → streak reset ve 0

### High Score & Leaderboard
- Luu top 10 diem cao nhat vao LocalStorage
- Hien thi bang xep hang voi ten nguoi choi (nhap ten khi dat top 10)
- Moi che do choi co bang xep hang rieng

## 4. Che do choi

### Classic Mode
- Gameplay chuan Block Blast
- Khong gioi han thoi gian, choi den khi het cho

### Time Attack
- Dong ho dem nguoc: 3 phut
- Gameplay giong Classic nhung race against time
- Het gio → game over, tinh diem
- Xoa hang/cot duoc +3 giay bonus

### Daily Challenge
- Moi ngay 1 bai thu thach co dinh (seed random theo ngay)
- Moi nguoi choi cung ngay se nhan cung thu tu khoi
- Muc tieu: dat diem cao nhat co the
- Luu ket qua daily vao LocalStorage, danh dau ngay da choi

### Tinh nang chung
- **Undo:** Hoan tac 1 buoc gan nhat (gioi han 3 lan moi game)
- **Pause:** Nhan ESC hoac nut pause, che luoi de khong gian lan

## 5. Do hoa Pixel Art & Hieu ung

### Pixel Art Style
- Moi o luoi: 32x32 pixel, vien 1px toi hon tao chieu sau
- 7 mau khoi: do, cam, vang, xanh la, xanh duong, tim, hong
  - Moi mau co 3 shade (sang/goc/toi) tao hieu ung 3D pixel
- Luoi nen: xam nhat voi grid line mo kieu retro
- Font chu: pixel font ("Press Start 2P" tu Google Fonts)

### Hieu ung
- **Dat khoi:** Nhap nhay nhe khi khoi "roi" vao vi tri
- **Xoa hang/cot:** Flash trang → pixel vo ra (particle explosion), o bien mat tung cai tu trai qua phai/tren xuong duoi
- **Combo:** Chu "COMBO x3!" hien len giua man hinh, kich thuoc lon dan roi fade out
- **Streak:** Thanh streak o canh phai phat sang theo cap do
- **Game Over:** Luoi toi dan tu tren xuong kieu "curtain fall", hien bang diem

### UI Layout
- Tren cung: logo game + nut pause/sound/music
- Giua: luoi 8x8 (trung tam man hinh)
- Ben phai: diem hien tai, high score, streak meter
- Ben duoi: 3 khoi cho dat + nut undo (hien so lan con lai)
- Menu chinh: Classic / Time Attack / Daily Challenge / Leaderboard / Settings

## 6. Am thanh & Nhac

### Sound Effects (8-bit style)
- Dat khoi: tieng "thup" ngan
- Xoa hang/cot: tieng "bling" tang pitch theo combo
- Combo: tieng fanfare ngan, pitch cao hon theo combo level
- Streak: tieng "ding" nho moi khi streak tang
- Undo: tieng "whoosh" nguoc
- Game Over: tieng melody buon ngan 8-bit
- Menu click: tieng "blip" nhe
- Khong dat duoc (invalid): tieng "buzz" ngan

### Nhac nen Chiptune
- Tao bang Web Audio API oscillator hoac file nhac
- 2-3 bai loop khac nhau, random moi game
- Tempo tang nhe khi luoi gan day (>60% o) de tao tension
- Chuyen bai muot bang crossfade

### Settings
- Toggle sound effects ON/OFF
- Toggle music ON/OFF
- Thanh volume rieng cho SFX va Music
- Luu settings vao LocalStorage

## 7. Technology Stack

- **Rendering:** Canvas 2D API
- **Language:** Vanilla JavaScript (ES Modules)
- **Styling:** CSS (menu, overlays)
- **Audio:** Web Audio API
- **Storage:** LocalStorage
- **Font:** Press Start 2P (Google Fonts)
- **No dependencies:** Khong dung framework hay thu vien ngoai

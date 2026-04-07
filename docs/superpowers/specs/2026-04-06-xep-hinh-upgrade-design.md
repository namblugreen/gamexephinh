# Xep Hinh Pixel - Nang Cap Toan Dien

## Muc tieu
Nang cap game Xep Hinh Pixel tu ban co ban len ban hoan chinh voi power-ups, responsive, themes, save game, settings tuong tac, va UI polish. Thu tu: Save > Responsive > Settings > Power-ups > Themes > UI Polish > Deploy GitHub Pages.

## 1. Luu Tien Trinh (Auto-save)

### Khi nao luu
- Tu dong sau moi nuoc di (dat piece xong)
- Khi spawn piece moi

### Du lieu luu
```
{
  board: number[][],        // 8x8 grid state
  pieces: Piece[],          // 3 pieces hien tai (null neu da dung)
  scoreState: ScoreState,   // score, streak, combo
  highScore: number,
  mode: ModeState,          // type, hasTimer, timeLeft, seed
  undosLeft: number,
  undoSnapshot: SnapshotOrNull,
  rngState: number|null     // seed hien tai cho daily mode
}
```

### localStorage keys
- `bbp_savegame` - save chinh (classic, timeattack)
- `bbp_savegame_daily` - save rieng cho daily mode

### Hanh vi
- Khi mo game: Neu co save -> hien nut "TIEP TUC" tren menu (tren nut Co Dien), mau xanh la (#44bb44)
- Click "TIEP TUC" -> load lai tran cu chinh xac
- Xoa save khi: game over, hoac bat dau tran moi
- Daily mode: Luu rieng key de khong xung dot voi save classic/timeattack

---

## 2. Responsive PC + Mobile

### Scale strategy
- Canvas giu resolution goc (456x416 pixels)
- Scale hien thi bang CSS `object-fit: contain`, canvas chiem 100% viewport
- JS tinh ty le tu `getBoundingClientRect()` de convert toa do mouse/touch chinh xac
- Da co san: `sx = canvas.width / rect.width, sy = canvas.height / rect.height`

### Touch improvements
- Mobile: nang piece len cao hon khi drag (offset -2*CELL thay vi -1*CELL) de khong bi ngon tay che
- Phat hien mobile: `'ontouchstart' in window`

### Fullscreen
- Them nut "TOAN MAN HINH" trong menu
- Dung `document.documentElement.requestFullscreen()`

### Constraints
- Minimum: 320px width
- Khuyen portrait tren mobile
- Landscape: van choi duoc, piece spawn giu o duoi

---

## 3. Settings Tuong Tac

### Giao dien
Moi dong setting la 1 vung click duoc (200x30px), highlight khi hover.

### Cac muc setting
| Setting | Kieu | Hanh vi |
|---------|------|---------|
| AM THANH | Toggle | Click de bat/tat SFX |
| NHAC | Toggle | Click de bat/tat music |
| AM LUONG | Range | Click trai (<) giam 10%, phai (>) tang 10% |
| NHAC LUONG | Range | Click trai (<) giam 10%, phai (>) tang 10% |
| CHU DE | Cycle | Click de chuyen theme tiep theo, preview ngay |
| XOA DU LIEU | Confirm | Click lan 1: text doi thanh "CHAC CHUA?", click lan 2: xoa tat ca localStorage |

### Luu
- Tu dong luu ngay khi thay doi bat ky setting nao
- Dung `Storage.saveSettings()` da co san

---

## 4. Power-ups

### 6 loai power-up

| # | Ten | Mo ta | Cach dung |
|---|-----|-------|-----------|
| 1 | BOM | Xoa vung 3x3 tai vi tri click | Click power-up -> click o tren board -> xoa 3x3 xung quanh |
| 2 | DOI MAU | Doi mau 1 piece trong spawn | Click power-up -> click piece -> piece doi sang mau ngau nhien |
| 3 | XOAY | Xoay 1 piece 90 do theo chieu kim dong ho | Click power-up -> click piece -> piece xoay |
| 4 | PHA HANG | Xoa sach 1 hang hoac cot bat ky | Click power-up -> click hang/cot tren board -> xoa sach |
| 5 | HOAN DOI | Swap 2 piece trong spawn | Click power-up -> click piece 1 -> click piece 2 -> swap |
| 6 | GHOST | Dat piece xuyen qua block co san | Click power-up -> piece tiep theo ignore collision khi dat. Chi dien vao o trong, o da co block giu nguyen. Van kiem tra line clear binh thuong sau khi dat |

### Cach kiem
- Moi 300 diem tich luy -> nhan 1 power-up ngau nhien
- Thong bao popup khi nhan duoc

### Gioi han
- Toi da giu 3 power-up cung luc
- Neu da day 3, power-up moi bi mat (hoac thay the cu nhat)

### UI
- 3 o vuong (40x40px) ben phai score panel, duoi phan HOAN TAC
- O trong: vien dam, khong icon
- Co power-up: hien icon pixel art + ten viet tat
- Click o de kich hoat, highlight vang khi active
- Nhan ESC hoac click lai icon de huy kich hoat

### Hieu ung
- BOM: no lon, particle nhieu, screen shake manh
- DOI MAU: piece flash trang roi doi mau, sparkle effect
- XOAY: piece quay animation 0.3s
- PHA HANG: sweep effect nhu clear line nhung manh hon
- HOAN DOI: 2 piece bay doi cho nhau animation 0.3s
- GHOST: piece trong suot 50% khi dat, ripple effect sau khi dat
- Moi loai co am thanh SFX rieng

---

## 5. Themes

### 4 bo theme

#### MAC DINH (default)
- bgColor: `#1a1a2e`
- gridBg: `#2a2a4a`, gridLine: `#3a3a5a`
- cellStyle: `square` (pixel 3D hien tai)
- palette: 7 mau hien tai
- bgEffect: none
- particleStyle: `square`

#### RETRO XANH (retro)
- bgColor: `#0a1a0a`
- gridBg: `#0a2a0a`, gridLine: `#1a3a1a`
- cellStyle: `square` (Game Boy style, contrast thap hon)
- palette: 7 sac do xanh la (dam -> nhat)
- bgEffect: none
- particleStyle: `square`

#### HOANG HON (sunset)
- bgColor: `#2a1a0e`
- gridBg: `#3a2a1e`, gridLine: `#4a3a2e`
- cellStyle: `rounded` (bo goc 4px)
- palette: 7 mau am nong (do, cam, vang, hong...)
- bgEffect: none
- particleStyle: `circle`

#### GALAXY (galaxy)
- bgColor: `#0a0a2e`
- gridBg: `#1a1a3e`, gridLine: `#2a2a4e`
- cellStyle: `diamond` (xoay 45 do)
- palette: 7 mau neon sang
- bgEffect: `stars` (50-100 dot sao nhap nhay random)
- particleStyle: `circle`

### Cau truc du lieu theme
```javascript
const THEMES = {
  default: { name: 'MAC DINH', bgColor, gridBg, gridLine, cellStyle, palette, bgEffect, particleStyle },
  retro:   { ... },
  sunset:  { ... },
  galaxy:  { ... },
};
```

### Ap dung
- Renderer doc theme hien tai tu settings
- `drawCell()` kiem tra `cellStyle` de ve vuong/tron/kim cuong
- `clear()` ve `bgColor` + `bgEffect` (sao cho galaxy)
- Particles dung `particleStyle` de ve vuong hoac tron
- Luu theme da chon trong settings

---

## 6. UI Polish

### Menu hover effect
- Nut sang len `#3a3a6a` khi mouse hover
- Track mouse position, kiem tra hitbox moi frame

### Spawn animation
- Piece moi scale tu 0 -> 1 trong 0.2s (easeOutBack)
- 3 piece xuat hien lech nhau 0.1s

### Transition man hinh
- Fade alpha 0 -> 1 trong 0.3s khi chuyen state
- Bien `transitionAlpha` giam dan, ve overlay den voi alpha do

### Nut TIEP TUC
- Mau xanh la (#44bb44), hien tren Co Dien khi co save
- Glow effect nhu title

### Power-up notification
- Bounce animation khi nhan power-up moi (scale 1 -> 1.3 -> 1 trong 0.3s)

### Board fill warning
- Khi `Board.getOccupiedCount(board) / 64 > 0.7`: vien grid nhap nhay do
- Nhap nhay: `gridLine` xen ke voi `#ff4444` moi 0.5s

### Game over animation
- Board "chay" tu tren xuong: moi hang lan luot doi mau xam (#555) voi delay 0.05s/hang
- Sau khi tat ca hang xam: fade in text "KET THUC"
- Thoi gian toan bo animation: ~0.8s

---

## 7. Deploy GitHub Pages

### Buoc thuc hien
1. Tao repo tren GitHub (hoac push repo hien tai)
2. Push code len branch `main`
3. Bat GitHub Pages tu Settings > Pages > Source: main branch, / (root)
4. Game truy cap tai: `https://<username>.github.io/<repo-name>/`

### Yeu cau
- Tat ca assets (game.js, css/style.css, index.html) da o root -> tuong thich GitHub Pages
- Khong can build step
- Font "Press Start 2P" load tu Google Fonts CDN -> hoat dong binh thuong

---

## Ky thuat chung

### File structure
- Van giu 1 file `game.js` (IIFE bundle)
- Du kien kich thuoc tang tu ~900 dong len ~1500-1800 dong
- Neu qua lon, co the tach thanh vai file (game.js, themes.js, powerups.js) va load bang `<script>` tags (khong dung ES modules de tranh CORS voi file://)

### Khong thay doi
- Van Canvas 2D, khong WebGL
- Van vanilla JS, khong framework
- Van Web Audio API procedural sound
- Van localStorage cho persistence
- Van 8x8 grid, cung luật choi co ban

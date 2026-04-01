# 💰 Finance Telegram Bot

Shaxsiy moliya menejment uchun to'liq Telegram bot.

## 🚀 O'rnatish

### 1. Talablar
- Node.js 18+
- MongoDB (local yoki Atlas)
- Telegram Bot Token

### 2. Loyihani yuklab olish
```bash
git clone <repo>
cd finance-bot
npm install
```

### 3. `.env` fayl yaratish
```bash
cp .env.example .env
```
`.env` faylini oching va tokenlarni to'ldiring:
```
BOT_TOKEN=7123456789:AAH...
MONGODB_URI=mongodb://localhost:27017/financebot
```

### 4. Botni ishga tushirish
```bash
npm start
# yoki development uchun:
npm run dev
```

---

## 🤖 Botdan foydalanish

### Birinchi marta
Bot ishga tushganda foydalanuvchi interfeys turini tanlaydi:
- **Inline tugmalar** — har bir javob ostida tugmalar chiqadi
- **Keyboard tugmalar** — pastda doim ko'rinadigan tugmalar paneli

---

## 📋 Barcha komandalar

### 💸 Xarajat & Daromad
| Komanda | Tavsif |
|---------|--------|
| `/add 25000 ovqat` | Xarajat qo'shish |
| `/income 3000000 oylik` | Daromad qo'shish |

### 📊 Ko'rish
| Komanda | Tavsif |
|---------|--------|
| `/today` | Bugungi hisobot |
| `/month` | Oylik hisobot |
| `/balance` | Jami balans |
| `/stats` | Oylik statistika |
| `/topcategory` | Top xarajat kategoriyalari |
| `/average` | Kunlik o'rtacha xarajat |

### 📂 Kategoriyalar
| Komanda | Tavsif |
|---------|--------|
| `/categories` | Kategoriyalar ro'yxati |
| `/addcategory 💊 Sog'liq` | Kategoriya qo'shish |
| `/removecategory` | Kategoriya o'chirish (inline) |

### 🔧 Boshqarish
| Komanda | Tavsif |
|---------|--------|
| `/setbudget 2000000` | Oylik budjet belgilash |
| `/reminder on` | Eslatmani yoqish |
| `/reminder off` | Eslatmani o'chirish |
| `/delete` | Yozuv o'chirish (so'nggi 5 ta) |
| `/edit <id> <summa> <kat>` | Yozuv tahrirlash |
| `/search ovqat` | Kategoriya bo'yicha qidiruv |
| `/search 2026-01` | Sana bo'yicha qidiruv |

### 📈 Hisobot & Grafik
| Komanda | Tavsif |
|---------|--------|
| `/report` | Excel hisobot yuklab olish |
| `/chart` | Grafik turi tanlash |

---

## 🗂 Loyiha tuzilmasi

```
finance-bot/
├── index.js                  # Asosiy fayl
├── package.json
├── .env                      # (o'zingiz yaratasiz)
├── models/
│   ├── User.js               # Foydalanuvchi modeli
│   └── Transaction.js        # Tranzaksiya modeli
├── handlers/
│   ├── commandHandler.js     # /komandalar
│   ├── callbackHandler.js    # Inline tugmalar
│   └── textHandler.js        # Matn & keyboard tugmalar
├── keyboards/
│   └── mainKeyboard.js       # Inline & reply klaviaturalar
├── services/
│   ├── statsService.js       # Statistika
│   ├── chartService.js       # Grafiklar (Canvas)
│   ├── reportService.js      # Excel hisobot
│   └── reminderService.js    # Eslatmalar (Cron)
└── tmp/                      # Vaqtinchalik fayllar (auto)
```

---

## ⚙️ Texnologiyalar

| Texnologiya | Foydalanish |
|-------------|-------------|
| `node-telegram-bot-api` | Telegram Bot API |
| `mongoose` | MongoDB ORM |
| `canvas` | Grafik chizish |
| `exceljs` | Excel hisobot |
| `node-cron` | Kunlik eslatmalar |
| `dotenv` | Environment variables |

---

## 🛡 Xavfsizlik
- Har bir foydalanuvchi faqat o'z ma'lumotlarini ko'radi
- `userId` barcha so'rovlarda filtrlash sifatida ishlatiladi

---

## 📞 Yordam
Biror muammo bo'lsa, `/start` bosing va qayta boshlang.

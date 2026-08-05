# Meshy AI + AR — тохиргооны заавар

Энэ төсөл нь зургийг [Meshy AI](https://www.meshy.ai) -ийн **Image to 3D** API-аар
3D загвар болгож, вэбээс шууд **iPhone (Quick Look)** болон **Android (Scene Viewer / WebXR)**
дээр AR-аар харуулна.

---

## 1. API түлхүүр авах

1. [meshy.ai](https://www.meshy.ai) дээр бүртгүүлнэ.
2. [Settings → API](https://www.meshy.ai/settings/api) хуудсанд орно.
3. **Create API Key** дарж нэр өгнө.
4. Гарч ирсэн `msy_...` утгыг хуулж авна — **дахин харагдахгүй**.

> Үнэ: Image-to-3D нэг даалгавар ойролцоогоор 15–30 кредит зарцуулна.
> Одоогийн үнийг [docs.meshy.ai/en/api/pricing](https://docs.meshy.ai/en/api/pricing) -оос шалгана уу.

## 2. Түлхүүрээ төсөлд оруулах

### Локал хөгжүүлэлт

Төслийн үндсэн хавтсанд `.env.local` файл үүсгэнэ:

```bash
cp .env.example .env.local
```

Дараа нь `.env.local` доторх утгыг солино:

```
MESHY_API_KEY=msy_таны_жинхэнэ_түлхүүр
```

`.env*` файлууд `.gitignore`-т орсон тул git-д орохгүй.

### Cloudflare дээр (production)

```bash
npx wrangler secret put MESHY_API_KEY
```

Эсвэл Cloudflare dashboard → Workers & Pages → төслөө сонгоод
**Settings → Variables and Secrets → Add → Secret**.

## 3. Ажиллуулах

```bash
npm install
npm run dev       # http://localhost:3000
```

---

## Урсгал хэрхэн ажилладаг вэ

```
Хэрэглэгч 1–4 зураг оруулна
   └─► браузер: эргүүлэлт/тайралт хэрэглэж 1536px JPEG болгоно  (lib/models.ts)
        └─► POST /api/generate                       (app/api/generate/route.ts)
             ├─ IP-ийн хурдны хязгаар               (lib/ratelimit.ts)
             ├─ кредитийн үлдэгдэл шалгах           (GET /openapi/v1/balance)
             └─► Meshy:  1 зураг → POST /image-to-3d
                         2–4    → POST /multi-image-to-3d
                  └─► task id буцна
                       └─► GET /api/task/<id> 2.5 сек тутам тандана
                            (PENDING үед 5 сек — дэмий дуудлага хэмнэнэ)
                            └─► SUCCEEDED болмогц
                                 ├─ /api/model/<id>/model.glb   → Android / вэб
                                 ├─ /api/model/<id>/model.usdz  → iOS Quick Look
                                 └─ /api/model/<id>/preview.png → thumbnail
```

### Хамгаалалт

`/api/generate` нээлттэй байвал хэн ч дуудаж таны Meshy кредитийг шатаана
(нэг даалгавар ≈15–30 кредит). Тиймээс:

- **IP-ийн хязгаар** — анхдагчаар цагт 5, өдөрт 20. `MORPH_GENERATIONS_PER_HOUR`
  / `MORPH_GENERATIONS_PER_DAY`-ээр өөрчилнө.
- **Кредитийн урьдчилсан шалгалт** — үлдэгдэл хүрэлцэхгүй бол Meshy-гээс 402
  авахын оронд ойлгомжтой мессеж буцаана.
- **Оролтын хатуу шалгалт** — зөвхөн jpg/png data URI, нэг зураг ≤8 MB,
  нийт ≤20 MB, хамгийн ихдээ 4 зураг.
- Даалгавар үүсгэж чадаагүй бол тоолуурыг **буцаана** (дэмий хязгаарлахгүй).

> Хязгаарлагч нь Cloudflare Cache API дээр суурилсан тул нэмэлт тохиргоо
> шаардахгүй. Сул тал: тоолуур нь дата төв тус бүрд тусдаа. Ноцтой ачаалалд
> KV эсвэл Durable Object руу шилжүүлэхэд `lib/ratelimit.ts`-ийн интерфейс
> хэвээр үлдэнэ.

### Нэг зураг vs олон зураг

| | Endpoint | Хэзээ |
|---|---|---|
| 1 зураг | `/image-to-3d` | Хурдан, энгийн объект |
| 2–4 зураг | `/multi-image-to-3d` | Өөр өнцгүүд → **геометр мэдэгдэхүйц сайжирна** |

Даалгаврын төрлийг серверт `getTask()` автоматаар таньдаг (эхлээд
`image-to-3d`, 404 бол `multi-image-to-3d`), үр дүнг Cache API-д хадгалж
дараагийн удаа шууд ононо. AR хуудас нь QR-аас зөвхөн id мэддэг тул энэ
чухал.

### Яагаад proxy хийж байна вэ?

Meshy-ийн буцаах татах хаягууд нь `?Expires=...` гарын үсэгтэй бөгөөд **хугацаа дуусдаг**.
Мөн iOS Quick Look болон Android Scene Viewer нь `.usdz` / `.glb` өргөтгөлтэй,
цэвэр URL, зөв `Content-Type` шаарддаг. `app/api/model/[id]/[file]/route.ts` нь:

- тогтвортой хаяг өгнө (`/api/model/<id>/model.usdz`),
- `Content-Type: model/vnd.usdz+zip` / `model/gltf-binary` тавина,
- `Range` хүсэлтийг дамжуулна (Quick Look үүнийг ашигладаг),
- Cloudflare-ийн ирмэг дээр 1 цаг кэшлэнэ,
- API түлхүүрийг браузерт огт харагдуулахгүй.

> **Анхаар:** Meshy файлуудыг тодорхой хугацааны дараа устгадаг
> ([Asset Retention](https://docs.meshy.ai/en/api/asset-retention)).
> Загварыг үүрд хадгалахыг хүсвэл GLB/USDZ-г Cloudflare R2 руу хуулах шаардлагатай.

---

## AR-ийн шаардлагууд

| Платформ | Технологи | Шаардлага |
|---|---|---|
| iPhone / iPad | AR Quick Look | iOS 12+, **Safari**. Chrome/Firefox дээр iOS-д ажиллана (WebKit) |
| Android | Scene Viewer | Chrome + [Google Play Services for AR](https://play.google.com/store/apps/details?id=com.google.ar.core) |
| Android | WebXR | Chrome 81+, ARCore дэмжсэн төхөөрөмж |
| Компьютер | зөвхөн 3D үзэх | AR горим байхгүй — QR кодыг утсаараа уншуулна |

### ⚠ HTTPS заавал шаардлагатай

AR **зөвхөн HTTPS** дээр ажиллана. `localhost` дээр 3D үзэгч ажиллах ч
Scene Viewer / Quick Look ажиллахгүй — учир нь тэдгээр нь файлын **бүтэн олон нийтэд
нээлттэй URL** шаарддаг.

Утсан дээрээ туршихдаа:

```bash
# сонголт 1 — Cloudflare-д deploy хийх
npm run build && npx vinext deploy

# сонголт 2 — түр туннель
npx cloudflared tunnel --url http://localhost:3000
```

---

## Гуравдагч талын сангууд (CDN-ээс ачаалагдана)

| Сан | Хувилбар | Хаана |
|---|---|---|
| `@google/model-viewer` | 4.3.1 | jsDelivr — 3D + AR үзэгч |
| `qrcode` | 1.5.4 | jsDelivr `+esm` — QR код |

Хоёуланг нь `lib/cdn.ts` динамикаар, зөвхөн хэрэгтэй үед нэг удаа ачаална.
Офлайн орчинд ажиллуулах шаардлагатай бол `npm install @google/model-viewer qrcode`
хийгээд `lib/cdn.ts` -ийг локал импорт руу солиж болно.

---

## Файлын бүтэц

```
lib/
  meshy.ts        Meshy API давхарга (түлхүүр ЗӨВХӨН энд уншигдана)
  ratelimit.ts    IP-ийн хурдны хязгаар (Cache API)
  edge-cache.ts   caches.default руу төрөл аюулгүй хандах
  models.ts       Клиент: зураг эргүүлэх/тайрах/шинжлэх, URL, localStorage сан
  cdn.ts          model-viewer / qrcode-г CDN-ээс ачаалах
app/
  api/generate/route.ts          POST — шинэ даалгавар (хамгаалалттай)
  api/task/[id]/route.ts         GET  — төлөв тандах (?kind= сонголттой)
  api/balance/route.ts           GET  — Meshy кредитийн үлдэгдэл
  api/model/[id]/[file]/route.ts GET  — GLB/USDZ/PNG proxy (?dl=1 → татах)
  ar/[id]/page.tsx               QR-аар нээгддэг бие даасан AR хуудас (server)
  components/ArViewer.tsx        AR хуудасны client хэсэг
  components/ModelViewer.tsx     <model-viewer> React боодол
  components/QrCode.tsx          бодит QR код
  components/MorphApp.tsx        үндсэн апп (upload → generate → studio → AR)
```

## Гар утасны дизайн

Хэрэглэгчдийн дийлэнх нь утсаар ордог тул ≤860px дээр бүтэц өөрчлөгдөнө
(`app/globals.css` — «ГАР УТАСНЫ ДИЗАЙН» хэсэг):

| Элемент | Компьютер | Утас |
|---|---|---|
| Навигац | зүүн rail | **доод таб бар** (өмнө нь бүрэн далдардаг байсан) |
| Студийн панель | баруун багана | **доод sheet** — татаж нээнэ, загвар бүтэн дэлгэцээр |
| Татах / Хуваалцах | текст товч | **дүрс товч** (өмнө нь `display:none` байсан — функц алдагдаж байсан) |
| Үүсгэх товч | доод талд | **наалдмал** — үргэлж эрхийн зайд |
| AR товч | QR-ийн дор | **наалдмал, том** — QR нуугдана (утсанд хэрэггүй) |
| Загварын сан | 3 багана | 2 багана (≤420px дээр 1) |
| Модал | төвд | доод талаас гарч ирнэ |

Мөн:

- **`100dvh`** бүх газарт (`100vh` биш) — Safari-ийн хаягийн мөр нуугдахад дэлгэц үсрэхгүй.
- **`viewportFit: "cover"` + `env(safe-area-inset-*)`** — iPhone-ий хонхорхой, доод зурааснаас зайлсхийнэ (`app/layout.tsx`).
- **Хүрэх талбай ≥44px** (Apple/Google-ийн зөвлөмж).
- **Input дээр 16px фонт** — iOS товшиход дэлгэц zoom хийхгүй.
- **Tap highlight унтраасан** — товч дарахад саарал гялбаа гарахгүй.

## Зургийн боловсруулалт

`Эргүүлэх` / `Квадрат тайрах` товчнууд нь **canvas дээр бодитоор** хэрэглэгдэж,
Meshy рүү явах өгөгдлийг өөрчилнө (`lib/models.ts · renderImage`). Өмнө нь
зөвхөн CSS transform байсан тул хэрэглэгч эргүүлээд илгээхэд эргээгүй загвар
ирдэг байсан.

`ЗУРГИЙН ШАЛГАЛТ` карт нь 96×96 canvas дээр пиксел уншиж дараахыг тооцоолно:

| Хэмжигдэхүүн | Хэрхэн |
|---|---|
| Гэрэлтүүлэг | дундаж luma (0.2126R + 0.7152G + 0.0722B) |
| Ялгарал | luma-гийн стандарт хазайлт |
| Дэвсгэр | захын пикселүүдийн нэгэн төрлийн байдал |
| Объектын хэмжээ | дэвсгэрээс ялгаатай пикселийн эзлэх хувь |

---

## Одоогийн хязгаарлалт

- **Хэрэглэгчийн сан** `localStorage`-д хадгалагдана — өөр хөтөч/төхөөрөмж дээр харагдахгүй.
  Жинхэнэ бүртгэлтэй болгохын тулд D1/KV + auth нэмэх хэрэгтэй.
- **Файл хадгалалт байхгүй.** Meshy-ийн хадгалах хугацаа дууссаны дараа загвар алга болно.
  R2 руу хуулах шийдлийг нэмэх боломжтой.
- **Студийн материал/өнгө** нь жишээ дүрслэлд л нөлөөлнө — Meshy-ийн текстур хэвээр үлдэнэ.
  Материал солихыг хүсвэл [Retexture API](https://docs.meshy.ai/en/api/retexture) ашиглана.
- **Үнийн багц, нэвтрэлт** нь одоогоор UI төдий, төлбөрийн систем холбогдоогүй.
- **Хурдны хязгаар** нь дата төв тус бүрд тусдаа тоологдоно (Cache API-ийн онцлог).
- **Мэдэгдэл** нь хэрэглэгч Notification зөвшөөрөл өгсөн тохиолдолд л ажиллана;
  бусад үед таб гарчигт явц харагдана.

## Дараагийн алхмуудад тохиромжтой

| Ажил | Юу өгөх вэ |
|---|---|
| [Retexture API](https://docs.meshy.ai/en/api/retexture) | Студийн материал/өнгө товчнуудыг бодит болгоно |
| [Webhooks](https://docs.meshy.ai/en/api/webhooks) | Polling-ийн оронд — Worker дээр хямд, шуурхай |
| R2 + D1 | Загвар үүрд хадгалагдана, олон төхөөрөмжөөс харагдана |
| [Rigging + Animation](https://docs.meshy.ai/en/api/rigging) | AR дээр хөдөлгөөнтэй загвар |
| [Text to 3D](https://docs.meshy.ai/en/api/text-to-3d) | Зураггүйгээр үүсгэх |

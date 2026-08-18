# Tripo3D → 3D → AR тохиргоо

Энэ төсөл зураг upload хийсний дараа Tripo3D-ийн албан ёсны v3 API-аар
текстуртай PBR GLB үүсгэж, R2-д хадгалан, web/Android GLB болон iPhone USDZ
хувилбар бэлтгэдэг.

## 1. Tripo API key

Төслийн үндсэн хавтсанд `.env.local` файлд дараах утгыг нэмнэ:

```env
TRIPO_API_KEY=tsk_өөрийн_api_key
TRIPO_API_BASE_URL=https://openapi.tripo3d.ai/v3
TRIPO_MODEL_VERSION=P1-20260311
TRIPO_FACE_LIMIT=10000
USE_MOCK_AI=false
```

- API key нь `tsk_`-ээр эхэлсэн байх ёстой.
- `NEXT_PUBLIC_` угтвар **бүү** хэрэглэ. Тэгвэл key browser bundle рүү орно.
- `P1-20260311` + 10,000 нүүр нь утасны AR-д хөнгөн гаралт өгөх үндсэн
  тохиргоо. Илүү нарийвчлал хэрэгтэй бол model/face limit-ийг өсгөж болох ч
  татах хэмжээ, боловсруулах хугацаа нэмэгдэнэ.

Key-ийн утга өөрөө код, git commit, screenshot, log-д орох ёсгүй.

## 2. Хадгалалт ба өгөгдлийн сан

Бодит Tripo урсгалд `.env.example`-ийн дараах серверийн тохиргоо мөн хэрэгтэй:

- Supabase URL, publishable key, service-role key
- Cloudflare R2 account ID, access key, secret key, bucket name
- Supabase-ийн хоёр migration

Tripo-ийн model URL богино хугацаатай тул GLB-ийг task амжилттай болмогц R2 руу
хуулдаг. Database-д зөвхөн object key болон төлөв хадгалагдана.

## 3. Model processor

Tripo GLB бэлэн болсны дараа тусдаа worker web болон Android-д оновчилсон GLB,
iPhone-д зориулсан USDZ үүсгэнэ:

```bash
npm run worker:models
```

Production-д энэ процессыг тасралтгүй ажилладаг container service дээр байрлуулна.
Vercel/Cloudflare-ийн богино request handler дотор ажиллуулахгүй. Дэлгэрэнгүйг
`MODEL-PROCESSING.md`-ээс харна.

## 4. AR ажиллах нөхцөл

- Нийтэд нээгдэх орчин **HTTPS** байх ёстой.
- iPhone/iPad: iOS 12+ ба AR Quick Look дэмждэг browser; USDZ зөв
  `model/vnd.usdz+zip` content type-тай байна.
- Android: ARCore/Google Play Services for AR болон Chrome; GLB Scene Viewer
  эсвэл WebXR-аар нээгдэнэ.
- Компьютер дээр 3D-г 360° үзнэ. AR хуудасны QR кодыг утсаар уншуулна.
- Хувийн model asset URL-ууд богино хугацааны signed URL-аар олгогдоно; API key
  болон bucket credential browser руу дамжихгүй.
- Үүсгэлтийн endpoint анхдагчаар нэг IP-д цагт 5, өдөрт 20 удаагийн
  хязгаартай. `MORPH_GENERATIONS_PER_HOUR` болон
  `MORPH_GENERATIONS_PER_DAY`-ээр өөрчилж болно.

## 5. Ажиллуулах ба шалгах

```bash
npm run dev
npm run worker:models
```

Дараа нь:

1. Demo workspace эсвэл Supabase account-аар нэвтэрнэ.
2. JPG, PNG, WebP (10 MB хүртэл) зураг оруулна.
3. `3D загвар үүсгэх` дарж progress-ийг хүлээнэ.
4. Төлөв `Бэлэн` болоход 3D preview, GLB download, QR, `AR-д харах` товчийг
   шалгана.
5. Production HTTPS URL-ийг iPhone болон ARCore Android төхөөрөмж дээр тус тус
   туршина.

Tripo task-ийг үүсгэсэн API key-ээр нь төлөв шалгах шаардлагатай. Generation
явагдаж байх үед key-г сольж болохгүй.

# Program Çakışması Kontrolü Rehberi

## Genel Bakış

Sistem, öğrencilerin aynı saatte birden fazla derse kayıt olmasını engellemek için program çakışması kontrolü yapar. Ancak geliştirme ve test aşamalarında bu kontrolü devre dışı bırakabilirsiniz.

## Environment Variable

### `ALLOW_SCHEDULE_CONFLICTS`

Bu değişken, program çakışması kontrolünü etkinleştirir veya devre dışı bırakır.

**Değerler:**
- `false` (varsayılan): Program çakışması kontrolü aktif. Çakışan derslere kayıt engellenir.
- `true`: Program çakışması kontrolü devre dışı. Çakışan derslere kayıt yapılabilir.

## Kullanım

### 1. .env Dosyasını Düzenleyin

Backend klasöründeki `.env` dosyanıza şu satırı ekleyin:

```env
# Çakışan derslere kayıt yapılmasına izin ver (geliştirme/test için)
ALLOW_SCHEDULE_CONFLICTS=true
```

### 2. Backend'i Yeniden Başlatın

Environment variable değişikliklerinin etkili olması için backend sunucusunu yeniden başlatın:

```bash
# Backend klasöründe
npm run dev
```

## Nasıl Çalışır?

### Çakışma Kontrolü Aktif (ALLOW_SCHEDULE_CONFLICTS=false)

- Sistem, öğrencinin mevcut dersleriyle yeni dersin programını karşılaştırır
- Eğer aynı gün ve saatte başka bir ders varsa, kayıt engellenir
- Öğrenciye "Program çakışması var" hatası gösterilir

### Çakışma Kontrolü Devre Dışı (ALLOW_SCHEDULE_CONFLICTS=true)

- Sistem çakışmayı tespit eder ancak kaydı engellemez
- Öğrenci çakışan derslere kayıt yapabilir
- Log'larda uyarı mesajı görünür ancak kayıt başarılı olur

## Örnek Senaryo

**Durum:** Öğrenci Pazartesi 09:00-10:30 saatlerinde bir derse kayıtlı. Aynı saatte başka bir derse kayıt olmak istiyor.

### ALLOW_SCHEDULE_CONFLICTS=false (Varsayılan)
```
❌ Kayıt engellendi: "Program çakışması var"
```

### ALLOW_SCHEDULE_CONFLICTS=true
```
⚠️ Çakışma tespit edildi ancak kayıt yapıldı
✅ Kayıt başarılı
```

## Notlar

- **Geliştirme/Test:** `ALLOW_SCHEDULE_CONFLICTS=true` kullanarak daha fazla ders alabilirsiniz
- **Production:** `ALLOW_SCHEDULE_CONFLICTS=false` olarak bırakın (varsayılan)
- Çakışma kontrolü sadece aynı dönem ve yıl içindeki dersler için geçerlidir
- Çakışma kontrolü, ders programı bilgisi (`schedule_json`) olan dersler için çalışır

## İlgili Dosyalar

- `src/services/enrollmentService.js` - Kayıt servisi
- `src/services/scheduleConflictService.js` - Çakışma kontrol servisi
- `env.example` - Environment variable örnekleri


# Privacy Model

The source repository must stay reusable and free of private address data.

Keep out of git:

```txt
- exact address
- coordinates of the real house
- photos
- measurements
- scans
- contractor documents
- downloaded geodata
- processed geometry generated from private coordinates
```

Use:

```txt
.env.local
local/
cache/
```

The checked-in app can contain domain models, generic adapters, mock building data and documentation. Real evidence belongs in local-only storage.

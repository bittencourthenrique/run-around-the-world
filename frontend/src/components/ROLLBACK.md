# Globe Map Implementation Rollback Guide

## Current Implementation
- **Active**: D3.js implementation (`GlobeMap.tsx`)
- **Backup**: MapLibre GL JS implementation (`GlobeMap.maplibre.tsx`)

## How to Rollback to MapLibre

If the D3.js implementation doesn't work as expected, follow these steps:

1. **Rename the current D3 implementation:**
   ```bash
   mv frontend/src/components/GlobeMap.tsx frontend/src/components/GlobeMap.d3.tsx
   ```

2. **Restore the MapLibre implementation:**
   ```bash
   mv frontend/src/components/GlobeMap.maplibre.tsx frontend/src/components/GlobeMap.tsx
   ```

3. **Restart the dev server:**
   ```bash
   npm run dev
   ```

## Alternative: Quick Switch via Import

You can also modify `App.tsx` to conditionally import:

```typescript
// Use D3.js implementation
import { GlobeMap } from './components/GlobeMap';

// Or use MapLibre implementation
// import { GlobeMap } from './components/GlobeMap.maplibre';
```

## Differences

- **D3.js**: Canvas-based rendering, halftone dots, custom styling, lighter weight
- **MapLibre**: WebGL-based rendering, vector tiles, more features out-of-the-box

Both implementations maintain the same component interface and props.


# Neo-Brutalist Demo Navigation

## Quick Access URLs

After starting the dev server (`npm run dev`), access the Neo-Brutalist views at:

- **Dashboard**: http://localhost:5173/demo/dashboard
- **Linking Module**: http://localhost:5173/demo/linking
- **Operations Board**: http://localhost:5173/demo/operations
- **Outreach Center**: http://localhost:5173/demo/outreach
- **People Directory**: http://localhost:5173/demo/people

## Adding Routes to App.tsx

To integrate these routes into your application, add the following to `App.tsx`:

```tsx
import NeoBrutalistRoutes from './pages/neo-brutalist/routes';

// Inside your Router component:
<BrowserRouter>
  <Routes>
    {/* Existing routes */}
    
    {/* Neo-Brutalist Demo Routes */}
    <Route path="/demo/*" element={<NeoBrutalistRoutes />} />
  </Routes>
</BrowserRouter>
```

## Direct Component Usage

You can also import components directly:

```tsx
import {
  NeoBrutalistDashboard,
  LinkingModule,
  OperationsBoard,
  OutreachCenter,
  PeopleDirectory
} from './pages/neo-brutalist';

// Or individual components:
import { BrutalCard, BrutalButton, BrutalBadge } from './components/neo-brutalist';
```

## Design System Reference

### Colors (LOOP Palette)
- Yellow: `#FFD700` - Dashboard/Warnings
- Green: `#90EE90` - Linking/Success  
- Purple: `#D8BFD8` - Outreach/Campaigns
- Pink: `#FFB6C1` - People Module

### Tailwind Classes
- Borders: `border-brutal` (2px solid black)
- Shadows: `shadow-brutal` (4px 4px 0px black, no blur)
- Fonts: `font-brutal` (weight 800)

### CSS Variables
```css
--loop-yellow: #FFD700;
--loop-green: #90EE90;
--loop-purple: #D8BFD8;
--loop-pink: #FFB6C1;
--border-brutal: 2px solid #000000;
--shadow-brutal: 4px 4px 0px #000000;
```

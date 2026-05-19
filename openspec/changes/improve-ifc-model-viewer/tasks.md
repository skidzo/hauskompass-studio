## 1. Layout And Sizing

- [x] 1.1 Replace IFC viewer inline layout styles with named CSS classes.
- [x] 1.2 Change the fixed 540 px viewer shell to a responsive height using available Building tab space.
- [x] 1.3 Add narrow-screen behavior that stacks or collapses support information without horizontal overflow.

## 2. Controls And Workspace

- [x] 2.1 Add a compact overlay toolbar for framing, display modes and focus mode.
- [x] 2.2 Add named camera preset actions that frame currently visible geometry.
- [x] 2.3 Convert the metrics/sidebar area into a collapsible drawer, rail or overlay.
- [x] 2.4 Preserve generated/source status inside normal and focused views.

## 3. Visual Polish

- [x] 3.1 Improve visual contrast and edge/outline treatment for inspection.
- [x] 3.2 Make the legend compact and non-obstructive.
- [x] 3.3 Ensure controls and status badges do not cover important model geometry at default framing.

## 4. Verification

- [x] 4.1 Run `npm test -- --run`.
- [x] 4.2 Run `npm run validate:metadata`.
- [x] 4.3 Manually inspect Building -> IFC Model at desktop and narrow widths.
- [x] 4.4 Verify framing, presets, old/new visibility, color mode, metrics visibility and focus mode.

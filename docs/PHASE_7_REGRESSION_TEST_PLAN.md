# Phase 7 — Final Regression Test Plan

This checklist validates the Vocal Note app after the drawing and eraser tools were removed. It is intended for the Vercel pull-request preview on desktop and Android/mobile browsers.

## Automated checks

Run these commands from the repository root:

```bash
npm ci --no-audit --no-fund
npm run lint
npm run build
```

The GitHub Actions workflow runs the same dependency-install, TypeScript, and production-build checks for pull requests targeting `main`.

## Desktop regression checklist

- [ ] App loads without a blank screen or uncaught runtime error.
- [ ] Create a new note and confirm it opens in the single-note editor.
- [ ] Type, edit, save, reopen, and verify the latest text is retained.
- [ ] Navigate back to the dashboard and reopen the note.
- [ ] Complete, recolor, and delete a note; confirm each action affects only the selected note.
- [ ] Start and stop voice dictation; confirm dictated text is inserted into the active note.
- [ ] Attach an image, save the note, reopen it, and remove the image.
- [ ] Create a note from a template and confirm its text, image, and styling are retained.
- [ ] Open note menus and verify their remaining actions work.
- [ ] Confirm pen, eraser, sketch mode, drawing canvas, pan, and drawing-specific controls are absent.

## Android/mobile regression checklist

- [ ] App loads and the dashboard remains usable at a narrow viewport.
- [ ] Create, edit, save, reopen, and delete a note using touch input.
- [ ] Verify the editor, save controls, menus, and voice controls remain reachable without horizontal overflow.
- [ ] Test voice dictation with microphone permission granted and denied.
- [ ] Attach and remove an image using the mobile file picker.
- [ ] Verify note text remains visible and editable after returning from the file picker.
- [ ] Confirm no drawing overlay intercepts taps or scrolling.

## Persistence and compatibility checks

- [ ] Reload the app and confirm newly saved notes remain present.
- [ ] If offline mode is supported by the current deployment, open the app offline and verify previously cached notes remain accessible.
- [ ] Import a valid older backup containing legacy drawing fields and confirm the text/image notes still load without errors.
- [ ] Export a backup and confirm existing note content and image data are included.
- [ ] Confirm removing drawing controls does not clear unrelated note content or attachments.

## Result recording

Record each manual item as **Pass**, **Fail**, or **Not tested**. Do not merge or deploy to production while any required automated check is failing or a critical manual regression remains unresolved.

A successful TypeScript check and production build do not replace manual desktop and mobile testing.

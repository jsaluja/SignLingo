# Gradio UI — Match React App

Component-by-component diff. React (5173) is the reference.

---

## Layout

- [ ] **Nav row**: React has `← [dots] →` compact and centered. Gradio spreads ← to far left and → to far right.
- [ ] **Panel headers**: React centers "Reference: Hello" and "Your Turn" inside the card. Gradio left-aligns.
- [ ] **Unified panel card**: React wraps both panels in a single dark card with consistent padding. Gradio has two separate columns with a gap.

## Left panel

- [ ] **Speed controls**: React has `0.5x | 1x | 1.5x` buttons below the video. Gradio has none.
- [ ] **Description style**: React uses italic, lighter grey (`sign-description` class). Gradio desc-box looks similar but bold name is too prominent.

## Right panel

- [ ] **Blue prompt bar**: React shows `Hello  Copy the sign shown on the left` as a solid blue bar below the webcam. Gradio has no prompt bar.
- [ ] **"Show your hands to start" text**: React shows this below the prompt bar as dimmed text. Gradio only shows it in the status dot row.

## Navigation

- [ ] **Keyboard ← → not working on 7860**: `demo.load(js=...)` not firing correctly. Fix selector or use inline script approach.

## Global

- [ ] **Footer**: React shows `Show your hands to start recording. Drop hands for 1 second to stop and score.` Gradio has nothing.
- [ ] **Header tabs**: React has Practice / Library tabs. Out of scope for Gradio but worth noting.

import { ViewPlugin } from "@codemirror/view";
import { guardOutsideCaret } from "../../utils/outside-caret-guard";

/**
 * Keeps a press beside the editor (on an ancestor's empty area) from putting the caret into CodeMirror's
 * content — see `guardOutsideCaret`. Presses inside `.cm-editor` behave natively.
 */
export const outsideClickGuard = ViewPlugin.define((view) => ({
  destroy: guardOutsideCaret(view.contentDOM, () => view.dom),
}));

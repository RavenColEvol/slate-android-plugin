import {diffText} from './diff-text'
import {Transforms} from 'slate'
import {ReactEditor} from 'slate-react'

export class CompositionManager {

  private observer: MutationObserver;
  private rootElement: Node | null = null;

  constructor(private editor: ReactEditor) {
    this.observer = new MutationObserver(this.processMutations);
  }

  connect = () => {
    const rootElement = ReactEditor.toDOMNode(this.editor, this.editor)
    if (this.rootElement === rootElement) return
    this.observer.observe(rootElement, {
      childList: true,
      characterData: true,
      attributes: true,
      subtree: true,
      characterDataOldValue: true
    })
    rootElement.addEventListener("compositionstart", this.onCompositionStart);
    rootElement.addEventListener("compositionend", this.onCompositionEnd);
  }

  disconnect = () => {
    if (this.rootElement !== null) {
      this.rootElement.removeEventListener("compositionstart", this.onCompositionStart);
      this.rootElement.removeEventListener("compositionend", this.onCompositionEnd);
      this.rootElement = null;
      this.observer.disconnect();
    }
  }

  private processMutations = (mutations: MutationRecord[]) => {
    if (mutations.length === 0) return;
    const mutation = mutations[0];
    if (mutation.type === 'characterData') {
      const domNode = mutation.target.parentNode!
      const node = ReactEditor.toSlateNode(this.editor, domNode)
      const prevText = node.text! as string
      const nextText = domNode.textContent!

      // If the text is no different, there is no diff.
      if (nextText !== prevText) {
        const textDiff = diffText(prevText, nextText)
        if (textDiff !== null) {
          const path = ReactEditor.findPath(this.editor, node)
          setTimeout(() => {
            Transforms.insertText(this.editor, textDiff.insertText, {at: {
                anchor: {path, offset: textDiff.start},
                focus: {path, offset: textDiff.end}
              }});
          }, 20);
        }
      }
    }
  }

  private onCompositionStart = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  }

  private onCompositionEnd = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  }
}

module TextRight {
  /** Takes a position of content and a line number to be passed between functions */
  export class LineContent {
    constructor(public text: TextAndPosition, public line: number) {
    }
  }

  /** Takes an array of LineContents so it can be treated as a single block of text. */
  export class ContentStream {
    constructor(content: LineContent[]) {
    }
  }

  //export function parseInlineContent()
}
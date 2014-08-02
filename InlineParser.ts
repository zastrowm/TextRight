module TextRight {
  /** Takes a position of content and a line number to be passed between functions */
  export class LineContent {
    constructor(public text: LineFragment, public line: number) {
    }
  }

  /** Takes an array of LineContents so it can be treated as a single block of text. */
  export class ContentStream {
    constructor(content: LineContent[]) {
    }
  }

  enum NodeType {
    Heading,
    Style,
    Quote,
    Text,
    UnorderedList,
    OrderedList,
    Html,
  }

  /**
   * Represents a chunk of the document that has been parsed into a single block
   */
  class Node {
    public type: NodeType;

    constructor(type: NodeType) {
      this.type = type;
    }
  }
}
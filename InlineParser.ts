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

  //class HeadingNode extends Node {
  //  /** The line from which the header came. */
  //  public origin: IHeaderLine;

  //  /** The line number that the header came from. */
  //  public lineNumber: number;

  //  /** The header-level (1 or more) of the heading */
  //  public level: number;

  //  constructor(lineBlock: IHeaderLine, lineNumber: number) {
  //    super(NodeType.Heading);

  //    this.origin = lineBlock;
  //    this.lineNumber = lineNumber;
  //  }
  //}

  //export function parseInlineContent()
}
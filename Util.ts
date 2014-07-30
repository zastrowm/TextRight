module TextRight {
  /**
   * Options for parsing TextRight
   */
  export class Options {
    constructor(
      public disallowSimpleParagraphs: boolean = false
      ) {
    }
  }

  export class Line {
    constructor(public index: number, public text: string) {
    }
  }

  /**
   * Holds the position of content within a string
   */
  export class StringPosition {
    public length: number;

    constructor(public start: number, public end: number, public line: Line) {
      this.length = end - start;
    }
  }

  /**
   * Holds the position of a substring within a larger string, and holds the text
   * that is found between those positions
   */
  export class TextAndPosition extends StringPosition {
    constructor(public start: number, public text: string, line: Line) {
      super(start, start + text.length, line);
    }

    public toJSON(): string {
      return this.text;
    }
  }

  /**
   * Evaluates a regular expression against a line and takes each captured
   * group one after another
   */
  export class RegexMatchIterator {
    regex: RegExp;
    results: string[];
    lastPosition: number;
    currentResultIndex: number;
    line: Line;

    public tryMatch(regex: RegExp, text: string, line: Line): boolean {
      this.regex = regex;
      this.results = text.match(regex);
      this.lastPosition = 0;
      this.currentResultIndex = 1;
      this.line = line;

      return this.results != null;
    }

    public nextPosition() {
      var start = this.lastPosition;
      var result = this.results[this.currentResultIndex];
      this.lastPosition += result.length;
      this.currentResultIndex++;

      return new TextAndPosition(start, result, this.line);
    }
  }

  /**
   * Indicates the type of block that a line represents
   */
  export enum LineBlockType {
    Heading,
    Style,
    Quote,
    Blank,
    Text,
    TextContinuation,
    UnorderedListItem,
    OrderedListItem,
    ListItemContinuation,
    HtmlTagStart,
    HtmlContinuation,
    HtmlTagEnd,
  }

  /**
   * Represents the data that is associated with each node
   */
  export interface ILineBlockData {
    content: TextAndPosition;
  }

  /**
   * Contains the representation of each line that is parsed
   */
  export class LineBlock {
    /**
     * @param type the type of block that was parsed
     * @param data the data associated with the block
     */
    constructor(public type: LineBlockType, public data: ILineBlockData) {
    }

    /**
     * Create a block that represents a block of all whitespace
     */
    public static createEmpty(line: Line) : LineBlock  {
      return new LineBlock(LineBlockType.Blank, {
        content: new TextAndPosition(0, line.text, line)
      });
    }

    /**
     * Create a block that represents a line that consists of plain text
     */
    public static createText(line: Line) : LineBlock {
      return new LineBlock(LineBlockType.Text, {
        content: new TextAndPosition(0, line.text, line)
      });
    }
  }
}
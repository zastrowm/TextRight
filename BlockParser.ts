module TextRight {
  /**
   * Represents a series of block
   */
  enum BlockType {
    Heading,
  }

  /**
   * A block is a single, high-level representation of a section in TextRight
   */
  class Block {
    constructor(public type: BlockType, data: any) {
    }
  }

  /** Textual content that is (possibly) marked-up with various inline formatting. */
  class InlineContent {
    constructor(blahBlahBlah: LineFragment) {
    }

    public static fromStringPosition(StringPosition: LineFragment) {
      return new InlineContent(StringPosition);
    }
  }

  /** Represents a series of list-items */
  interface IListBlock {
  }

  /** A single list item */
  interface IListItemBlock {
    /** The list block to which this item belongs */
    parent: IListBlock;

    /** All of the lines associated with the item. */
    lines: ParsedLine[];
  }

  /** A block representing a header item */
  interface IHeadingBlock {
    /** The numeric heading level */
    level: number;

    /** The textual content of the header */
    content: InlineContent;

    /** The original parsed line representing the header */
    line: ParsedLine;
  }

  /** Concrete implementation of IHeadingBlock*/
  class HeadingBlock {
    private headingLine: IHeadingLine;

    constructor(line: ParsedLine, data: IHeadingLine) {
      this.headingLine = data;
    }
  }

  /** Transform a heading line into a heading block */
  function transformHeading(line: ParsedLine) {
    var data: IHeadingLine = line.data;

    var level: IHeadingBlock = {
      level: data.prefix.length,
      content: InlineContent.fromStringPosition(data.content),
      line: line
    };

    return new Block(BlockType.Heading, level);
  }

  /** Parses a series of parsed lines and combines them to former larger blocks. */
  function parse(lines: ParsedLine[], options: Options) {
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var nodes = [];

      switch (line.type) {
        case ParsedLineType.Heading:
          nodes.push(transformHeading(line));
      }
    }
  }
}
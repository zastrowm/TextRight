module TextRight {
  /**
   * Represents a series of block
   */
  export enum BlockType {
    /** A heading of text */
    Heading,
    /** A list item */
    ListItem,
    /** A block of raw content */
    Raw,
    /** A series of lines representing a block quote */
    Quote,
    /** A style to apply to the next block */
    Style,
    /** A bunch of inline content */
    Paragraph
  }

  /**
   * A block is a single, high-level representation of a section in TextRight
   */
  export class Block {
    constructor(public blockType: BlockType, public data: any) {
    }
  }

  /** A block representing a header item */
  export interface IHeadingBlock {
    /** The numeric heading level */
    level: number;

    /** The textual content of the header */
    inlineContent: LineFragment;

    /** The original parsed line representing the header */
    line: ParsedLine;
  }

  /** Transform a heading line into a heading block */
  function transformHeading(iterator: ArrayIterator<ParsedLine>) {
    var line = iterator.current;
    var data: IHeadingLine = line.data;

    var level: IHeadingBlock = {
      level: data.prefix.length,
      inlineContent: data.content,
      line: line
    };

    return new Block(BlockType.Heading, level);
  }

  /** Represents a single list item composed of one or more lines */
  export interface IListItemBlock {
    /** True if the item is an ordered list */
    isOrdered: boolean;

    /** The lines that compose the item. */
    lines: ParsedLine[];

    /** The fragments that compose the block content of the block. */
    blockContent: LineFragment[];

    /** The prefix used to denote the list item. */
    prefix: string;
  }

  function transformListItem(iterator: ArrayIterator<ParsedLine>): Block {
    var line = iterator.current;
    var isOrdered = line.lineType == ParsedLineType.OrderedListItem;

    var prefix: string;
    var fragment: LineFragment;

    if (isOrdered) {
      var orderedData = (<IOrderedListItemLine>line.data);
      prefix = orderedData.prefix.text;
      fragment = orderedData.content;
    } else {
      var unorderedData = (<IUnorderdListItemLine>line.data);
      prefix = unorderedData.prefix.text;
      fragment = unorderedData.content;
    }

    var lines: ParsedLine[] = [line];
    var itemLines: LineFragment[] = [fragment];

    // go ahead and consume all line continuation items, as they are part of this
    // list item
    var nextLine = iterator.peek();
    while (nextLine != null && nextLine.lineType == ParsedLineType.ListItemContinuation) {
      var itemLine = (<IListItemContinuationLine>nextLine.data);
      lines.push(nextLine);
      itemLines.push(itemLine.content);

      iterator.next();
      nextLine = iterator.peek();
    }

    var data: IListItemBlock = {
      isOrdered: true,
      blockContent: itemLines,
      lines: lines,
      prefix: prefix
    };

    return new Block(BlockType.ListItem, data);
  }

  /** Block of raw data */
  export interface IRawBlock {
    /** The tag name of the opening xml tag */
    tagName: string;
    /** true if the item is closed by a closing xml tag, false if it is closed by the end of the document. */
    isClosed: boolean;
    /** The lines that compose the block. */
    lines: ParsedLine[];
    /** The content between the opening and closing tag. */
    innerContent: LineFragment[];
  }

  function transformXml(iterator: ArrayIterator<ParsedLine>): Block {
    var line = iterator.current;
    var xmlLine = <IRawStartTagLine>line.data;

    var lines: ParsedLine[] = [line];
    var innerContent: LineFragment[] = [];

    var nextLine = iterator.peek();

    while (nextLine != null && nextLine.lineType != ParsedLineType.RawTagEnd) {
      innerContent.push((<IContentLine>nextLine.data).content);
      lines.push(nextLine);
      nextLine = iterator.peek();
      iterator.next();
    }

    // null means we reached the end, non-null means we reached an end tag
    var isClosed = nextLine != null;
    if (isClosed) {
      // move to the closing xml tag
      iterator.next();
      lines.push(iterator.current);
    }

    var data: IRawBlock = {
      tagName: xmlLine.tagName.text,
      lines: lines,
      innerContent: innerContent,
      isClosed: isClosed
    };

    return new Block(BlockType.Raw, data);
  }

  /** Quote block */
  export interface IQuoteBlock {
    /** The lines that compose the block. */
    lines: ParsedLine[];

    /** The content between the opening and closing tag. */
    blockContent: LineFragment[];
  }

  function transformQuote(iterator: ArrayIterator<ParsedLine>): Block {
    var line = iterator.current;
    var quote = <IQuoteLine>line.data;

    var lines: ParsedLine[] = [line];
    var contents: LineFragment[] = [quote.content];

    var next = iterator.peek();
    while (next != null && next.lineType == ParsedLineType.Quote) {
      lines.push(next);
      contents.push((<IQuoteLine>next.data).content);
      iterator.next();
    }

    var data: IQuoteBlock = {
      lines: lines,
      blockContent: contents
    };

    return new Block(BlockType.Quote, data);
  }

  /** A block which contains a style for the block following this one */
  export interface IStyleBlock {
    content: string;

    line: ParsedLine;
  }

  function transformStyle(iterator: ArrayIterator<ParsedLine>): Block {
    var style = <IStyleLine>iterator.current.data;

    var data: IStyleBlock = {
      content: style.content.text,
      line: iterator.current
    }

    return new Block(BlockType.Style, data);
  }

  /** A block of paragraph text */
  export interface IParagraphBlock {
    /** The lines from which the paragraphs originated */
    lines: ParsedLine[];
    /** The content of the paragraphs*/
    inlineContent: LineFragment[];
  }

  function transformParagraph(iterator: ArrayIterator<ParsedLine>): Block {
    var text = <IContentLine>iterator.current.data;

    var lines: ParsedLine[] = [iterator.current];
    var content: LineFragment[] = [text.content];

    iterator.peekAndConsume((next: ParsedLine) => {
      if (next.lineType != ParsedLineType.Text)
        return false;

      lines.push(next);
      content.push((<IContentLine>next.data).content);

      return true;
    });

    var data: IParagraphBlock = {
      lines: lines,
      inlineContent: content
    };

    return new Block(BlockType.Paragraph, data);
  }

  /** Parses a series of parsed lines and combines them to former larger blocks. */
  function parse(lines: ParsedLine[], options: Options): Block[] {
    var iterator = new ArrayIterator<ParsedLine>(lines);
    var blocks: Block[] = [];

    while (iterator.isValid) {
      switch (iterator.current.lineType) {
        case ParsedLineType.Heading:
          blocks.push(transformHeading(iterator));
          break;
        case ParsedLineType.OrderedListItem:
        case ParsedLineType.UnorderedListItem:
          blocks.push(transformListItem(iterator));
          break;
        case ParsedLineType.RawTagStart:
          blocks.push(transformXml(iterator));
          break;
        case ParsedLineType.Quote:
          blocks.push(transformQuote(iterator));
          break;
        case ParsedLineType.Style:
          blocks.push(transformStyle(iterator));
          break;
        case ParsedLineType.Text:
          blocks.push(transformParagraph(iterator));
          break;
        case ParsedLineType.Blank:
          // noop
          break;
        default:
          throw Error('Invalid type: ' + ParsedLineType[iterator.current.lineType]);
      }

      iterator.next();
    }

    return blocks;
  }

  /**
   * Parses a series of lines into blocks
   */
  export class BlockParser {
    constructor(private options: Options = new Options()) {
    }

    /** Convert the lines into blocks */
    public parse(lines: ParsedLine[]): Block[] {
      return parse(lines, this.options);
    }
  }

  /**
 * Allows iterating through an array
 */
  class ArrayIterator<T> {
    constructor(public array: T[], public index: number = 0) {
    }

    /** Check if the current position is valid */
    public get isValid(): boolean {
      return this.index < this.array.length;
    }

    /** Get the current element within the array.  Undefined if isValid is false */
    public get current(): T {
      return this.array[this.index];
    }

    /** Iterate to the next object, returning true if the item is current*/
    public next(): boolean {
      this.index++;
      return this.isValid;
    }

    /**
     * Look forward or backward into the array
     * @param seek the number of elements to look ahead (or back)
     */
    public peek(seek: number = 1): T {
      var peekIndex = this.index + seek;

      if (peekIndex < 0 || peekIndex >= this.array.length) {
        return null;
      } else {
        return this.array[peekIndex];
      }
    }

    /**
     * Continuing passing in the next item and consuming items until callback
     *  returns false
     */
    public peekAndConsume(callback: (item: T) => boolean) {
      var next = this.peek();

      while (next != null) {
        if (callback(next)) {
          this.next();
          next = this.peek();
        } else {
          break;
        }
      }
    }
  }
}
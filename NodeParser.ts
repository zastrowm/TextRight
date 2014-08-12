module TextRight {
  export interface IAttribute {
    key: string;
    value: string;
  }

  export interface IInlineContent {
  }

  export interface INode {
    type: string;

    tags: ITag[];

    children: INode[];
  }

  export class NodeTypes {
    public static HEADING = "HEADING";
    public static QUOTE = "QUOTE";
    public static LISTORDERED = "LISTORDERED";
    public static LISTUNORDERED = "LISTUNORDERED";
    public static RAW = "RAW";
    public static PARAGRAPH = "PARAGRAPH";
    public static EMPTY = "EMPTY";
  }

  function createInlineNode(text: LineFragment, parsers: Parsers): IInlineContent {
    // TODO
    return <any>text.text;
  }

  function createInlineNodes(text: LineFragment[], parsers: Parsers): IInlineContent {
    // TODO
    return <any>text.map(l => l.text).join("\n");
  }

  /** A tag for blocks */
  export interface ITag {
    /** The name of the tag */
    name: string;
  }

  function createStyleTag(styleBlock: IStyleBlock): ITag {
    return {
      name: styleBlock.content
    };
  }

  export interface IHeadingNode extends INode {
    level: number;

    inlineContent: IInlineContent;
  }

  function createHeadingNode(
    block: IHeadingBlock,
    tags: ITag[],
    parsers: Parsers): IHeadingNode {
    return {
      type: NodeTypes.HEADING,
      inlineContent: createInlineNode(block.inlineContent, parsers),
      tags: tags,
      level: block.level,
      children: []
    };
  }

  export interface IQuoteNode extends INode {
  }

  function createQuoteNode(block: IQuoteBlock, tags: ITag[], parsers: Parsers): IQuoteNode {
    var children = parsers.parseLines(block.blockContent);

    return {
      type: NodeTypes.QUOTE,
      tags: tags,
      children: children,
    };
  }

  export interface IListNode extends INode {
    /** The list-item prefix that was used for the first item. */
    listInitialValue: string;
  }

  export enum OrderedListNodeType {
    Decimal,
    DecimalLeadingZero,
    RomanLower,
    RomanUpper,
    AlphaLower,
    AlphaUpper,
    Any,
  }

  function countLowercase(str: string): number {
    var matches = str.match(/^[a-z]$/);
    if (matches == null) {
      return 0;
    } else {
      return matches.length;
    }
  }

  function determineOrderedListType(prefix: string): OrderedListNodeType {
    if (/^#+$/.test(prefix)) {
      return OrderedListNodeType.Any;
    } else if (/^[0-9]+$/.test(prefix)) {
      return prefix[0] == "0"
        ? OrderedListNodeType.DecimalLeadingZero
        : OrderedListNodeType.Decimal;
    } else if (/^[ivxlcdm]+$/i.test(prefix)) {
      // the number of matches of lowercase letters
      var isMainlyLowercase = countLowercase(prefix) / prefix.length > 0.5;

      return isMainlyLowercase
        ? OrderedListNodeType.RomanLower
        : OrderedListNodeType.RomanUpper;
    } else {
      // must be alpha
      // the number of matches of lowercase letters
      var isMainlyLowercase2 = countLowercase(prefix) / prefix.length > 0.5;

      return isMainlyLowercase2
        ? OrderedListNodeType.RomanLower
        : OrderedListNodeType.RomanUpper;
    }
  }

  export interface IOrderedListNode extends IListNode {
    listType: OrderedListNodeType
  }

  export enum UnorderedListNodeType {
    Asterix,
    Dash,
    Plus
  }

  function determineUnorderedListType(prefix: string) {
    switch (prefix) {
      case "*":
        return UnorderedListNodeType.Asterix;
      case "+":
        return UnorderedListNodeType.Plus;
      default:
        return UnorderedListNodeType.Dash;
    }
  }

  export interface IUnorderedListNode extends IListNode {
    listType: UnorderedListNodeType;
  }

  function createListItem(block: IListItemBlock, tags: ITag[], parsers: Parsers): IListNode {
    var children = parsers.parseLines(block.blockContent);

    if (block.isOrdered) {
      var orderedList: IOrderedListNode = {
        type: NodeTypes.LISTORDERED,
        children: children,
        listInitialValue: block.prefix,
        listType: determineOrderedListType(block.prefix),
        tags: tags
      };

      return orderedList;
    } else {
      var unorderedlist: IUnorderedListNode = {
        type: NodeTypes.LISTUNORDERED,
        children: children,
        listInitialValue: block.prefix,
        tags: tags,
        listType: determineUnorderedListType(block.prefix)
      };

      return unorderedlist;
    }
  }

  export interface IRawNode extends INode {
    /** True if the raw block was closed */
    isClosed: boolean;

    /** True if the raw block was all on one line */
    isSimple: boolean;

    /** All of the content inside of the start and close tag*/
    rawContent: string[];

    /** The name of the raw block start and end tag */
    name: string;

    /** The attributes associated with the raw start tag node. */
    attributes: IKeyValue[];
  }

  function createRawNode(block: IRawBlock, tags: ITag[]): IRawNode {
    var node: IRawNode = {
      type: NodeTypes.RAW,
      isClosed: block.isClosed,
      children: [],
      isSimple: false,
      tags: tags,
      name: block.tagName,
      attributes: block.attributes,
      rawContent: block.innerContent.map(c => c.text)
      };

    return node;
  }

  export interface IParagraphNode extends INode {
    inlineContent: IInlineContent;
  }

  function createParagraphNode(block: IParagraphBlock, tags: ITag[], parsers: Parsers): IParagraphNode {
    var node: IParagraphNode = {
      type: NodeTypes.PARAGRAPH,
      inlineContent: createInlineNodes(block.inlineContent, parsers),
      tags: tags,
      children: [],
    };

    return node;
  }

  function parse(blocks: Block[], parsers: Parsers): INode[] {
    var nodes: INode[] = [];
    var tags: ITag[] = [];
    var readIterator = new ArrayIterator<Block>(blocks);

    while (readIterator.isValid) {
      var shouldNotClear = false;
      var block = readIterator.current;

      switch (block.blockType) {
        case BlockType.Heading:
          nodes.push(createHeadingNode(<IHeadingBlock>block.data, tags, parsers));
          break;
        case BlockType.ListItem:
          nodes.push(createListItem(<IListItemBlock>block.data, tags, parsers));
          break;

        case BlockType.Quote:
          nodes.push(createQuoteNode(<IQuoteBlock>block.data, tags, parsers));
          break;
        case BlockType.Raw:
          shouldNotClear = true;
          nodes.push(createRawNode(<IRawBlock>block.data, tags));
          break;
        case BlockType.Paragraph:
          nodes.push(createParagraphNode(<IParagraphBlock>block.data, tags, parsers));
          break;
        case BlockType.Style:
          tags.push(createStyleTag(<IStyleBlock>block.data));
          shouldNotClear = true;
          break;
        case BlockType.Empty:
          // TODO
          shouldNotClear = true;
          nodes.push(<any>{
            type: NodeTypes.EMPTY
          });
          break;
        default:
         throw new Error("Unrecognized block type: " + block.blockType);
      }

      if (shouldNotClear != true) {
        tags = [];
      }

      readIterator.next();
    }

    // TODO consolidate list items
    // TODO remove empty items that aren't part of the rest of stuff

    return nodes;
  }

  export class NodeParser {
    constructor(private parsers: Parsers = new Parsers()) {
      if (this.parsers.nodeParser == null) {
        this.parsers.nodeParser = this;
      }
    }

    public parse(blocks: Block[]): INode[] {
      return parse(blocks, this.parsers);
    }
  }
} 
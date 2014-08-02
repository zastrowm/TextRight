module TextRight {
  function parse(blocks: Block[]) {
  }

  export class NodeParser {
    constructor(
      private options: Options = new Options(),
      private blockParser: BlockParser = new BlockParser(options),
      private inlineParser: InlineParser = new InlineParser(options)) {
    }

    public parse(blocks: Block[]) {
    }
  }
} 
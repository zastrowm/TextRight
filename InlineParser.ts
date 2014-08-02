module TextRight {
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
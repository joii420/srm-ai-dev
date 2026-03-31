interface TreeNode {
  children?: TreeNode[];
  [key: string]: any;
}

export const traverseTree = (
  tree: TreeNode,
  callback: (tree: TreeNode) => void,
) => {
  callback(tree);
  if (tree.children) {
    tree.children.forEach((b) => traverseTree(b, callback));
  }
};

export const mapTree = (
  tree: TreeNode,
  callback: (tree: TreeNode) => TreeNode,
) => {
  const mapped = callback(tree);
  if (tree.children && tree.children.length) {
    const children: TreeNode[] = tree.children.map((branch) =>
      mapTree(branch, callback),
    );
    return { ...mapped, children };
  }
  return { ...mapped };
};

/**
 * This function sorts the object's value which is array of string.
 *
 * @param {Record<string, Array<string>>} data
 * @return {*}
 */
export const sortObjectWithArray = (data: Record<string, Array<string>>) => {
  Object.entries(data).map(([key, value]) => {
    data[key] = value.sort();
  });
  return data;
};

export const traverseTreeData = (
  tree: TreeNode[],
  callback: (tree: TreeNode, parentNode?: TreeNode) => void,
  parentNode?: TreeNode,
) => {
  if (!tree?.length) return;

  for (let i = 0, len = tree.length; i < len; i++) {
    const node = tree[i];
    callback(node, parentNode);

    if (node.children?.length) {
      traverseTreeData(node.children, callback, parentNode);
    }
  }
};

export const findItemByTravelTree = (
  tree: TreeNode[],
  callback: (node: TreeNode, parentNode?: TreeNode) => boolean,
  parentNode?: TreeNode,
): any => {
  if (!tree?.length) return null;

  for (let i = 0, len = tree.length; i < len; i++) {
    const node = tree[i];
    const isMatch = callback(node, parentNode);
    if (isMatch) return node;

    if (node.children?.length) {
      const result = findItemByTravelTree(node.children, callback, parentNode);
      if (result) return result;
    }
  }

  return null;
};

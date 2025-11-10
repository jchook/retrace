export function getDocumentFileUrl(document: { id: number }): string {
  return `/v1/documents/${document.id}/file`;
}

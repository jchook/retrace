import { createFileRoute } from '@tanstack/react-router'
import { Suspense, useState } from 'react'
import { useGetItemsId, useGetItemsIdDocuments } from 'src/gen'
import { Button, Card, Group, Stack, Text, Title, Anchor } from '@mantine/core'
import { LazyFilePond } from 'src/components/LazyFilePond'

export const Route = createFileRoute('/items_/$itemId')({
  component: ItemDetail,
})

function ItemDetail() {
  const { itemId } = Route.useParams()
  const id = Number(itemId)
  const { data: item } = useGetItemsId(id)
  const docs = useGetItemsIdDocuments(id)
  const [files, setFiles] = useState<File[]>([])

  if (!item) return null

  return (
    <Stack>
      <Title order={2}>{item.title}</Title>
      <Text c="dimmed">{item.description}</Text>

      <Card withBorder>
        <Stack>
          <Text fw={600}>Upload Documents</Text>
          <Suspense>
            <LazyFilePond
              files={files}
              onupdatefiles={(fileItems: any[]) => setFiles(fileItems.map((fi) => fi.file))}
              allowMultiple
              maxParallelUploads={3}
              onprocessfile={(error: unknown, file: any) => {
                if (!error) {
                  setFiles((prev) => prev.filter((f) => f !== file.file))
                  docs.refetch()
                }
              }}
              server={{
                process: { url: `/v1/documents?itemId=${id}`, timeout: 20000 },
                revert: null as any,
              }}
              name="files"
            />
          </Suspense>
        </Stack>
      </Card>

      <Card withBorder>
        <Group justify="space-between" mb="sm">
          <Text fw={600}>Documents</Text>
          <Button variant="light" onClick={() => docs.refetch()}>Refresh</Button>
        </Group>
        <Stack>
          {(docs.data ?? []).map((doc) => (
            <Group key={doc.id}>
              <Anchor href={`/v1/documents/${doc.id}/file`} target="_blank" rel="noopener noreferrer">{doc.filename}</Anchor>
              <Text size="sm" c="dimmed">{new Date(doc.uploadedAt).toLocaleString()}</Text>
            </Group>
          ))}
          {(docs.data ?? []).length === 0 && <Text c="dimmed">No documents. Upload some above, then click Refresh.</Text>}
        </Stack>
      </Card>
    </Stack>
  )
}

import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useGetItems, usePostItems, useDeleteItemsId } from 'src/gen'
import { Button, Card, Group, Stack, Text, TextInput, Title } from '@mantine/core'
import { useForm } from '@mantine/form'

export const Route = createFileRoute('/items')({
  component: Items,
})

function Items() {
  const { data: items } = useGetItems()
  const createItem = usePostItems({
    mutation: {
      onSuccess: (item) => navigate({ to: '/items/$itemId', params: { itemId: String(item.id) } }),
    },
  })
  const deleteItem = useDeleteItemsId()
  const navigate = useNavigate()

  const form = useForm({
    initialValues: { title: '', description: '' },
  })

  return (
    <Stack>
      <Title order={2}>Items</Title>
      <Card withBorder>
        <form onSubmit={form.onSubmit((values) => createItem.mutate({ data: values }))}>
          <Group align="end">
            <TextInput label="Title" placeholder="My item" {...form.getInputProps('title')} required w={300} />
            <TextInput label="Description" placeholder="Optional" {...form.getInputProps('description')} w={400} />
            <Button type="submit" loading={createItem.isPending}>Create</Button>
          </Group>
        </form>
      </Card>

      <Stack>
        {(items ?? []).map((item) => (
          <Card key={item.id} withBorder>
            <Group justify="space-between">
              <Stack gap={2}>
                <Link to="/items/$itemId" params={{ itemId: String(item.id) }} style={{ textDecoration: 'none' }}>
                  <Text fw={600}>{item.title}</Text>
                </Link>
                <Text size="sm" c="dimmed">{item.description}</Text>
              </Stack>
              <Button color="red" variant="light" onClick={() => deleteItem.mutate({ id: item.id })}>Delete</Button>
            </Group>
          </Card>
        ))}
      </Stack>
    </Stack>
  )
}

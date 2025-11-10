import { createFileRoute } from "@tanstack/react-router";
import { Text, Stack, Code, Group, Card, Anchor } from "@mantine/core";
import { MaxWidth } from "src/components/MaxWidth";
import { useGetMetaInfo } from "src/gen";

export const Route = createFileRoute("/info")({
  component: InfoComponent,
});

function formatValue(value: unknown): React.ReactNode {
  if (value === undefined || value === null) {
    return (
      <Code c="dimmed" fs="italic">
        undefined
      </Code>
    );
  }

  if (typeof value === "number") {
    return <Code c="red">{value}</Code>;
  }

  if (typeof value === "string") {
    if (/^v?[\d.]+$/.test(value) || /^[0-9a-f]{7,40}$/i.test(value)) {
      return <Code c="red">{value}</Code>;
    }
    if (
      value.startsWith("/") ||
      value.includes("/") ||
      value.includes("\\") ||
      /^https?:\/\//.test(value) ||
      /^[a-z]+:\/\//.test(value)
    ) {
      return <Code c="blue">{value}</Code>;
    }
    return <Text c="gray.7">{value}</Text>;
  }

  if (typeof value === "boolean") {
    return <Code c="violet">{value.toString()}</Code>;
  }

  return <Code block>{JSON.stringify(value, null, 2)}</Code>;
}

function InfoComponent() {
  const { data: info } = useGetMetaInfo();
  return (
    <MaxWidth>
      <Stack p="md">
        <Text size="xl" fw={700}>App</Text>
        <Text size="sm" c="dimmed">Minimal demo</Text>
        <Group>
          <Anchor
            href="/v1/meta/docs/"
            target="_blank"
            rel="noopener noreferrer"
          >
            API Documentation
          </Anchor>
        </Group>
        {info && (
          <Card withBorder>
            <Card.Section p="md">
              <Text fw={500} size="sm" c="dimmed">
                API Information
              </Text>
            </Card.Section>
            <Stack gap="sm">
              {Object.entries(info).map(([key, value]) => (
                <Group key={key} gap="sm">
                  <Text fw={500} c="dimmed">
                    {key}:
                  </Text>
                  {formatValue(value)}
                </Group>
              ))}
            </Stack>
          </Card>
        )}
      </Stack>
    </MaxWidth>
  );
}

import { Box } from "@mantine/core";

export function MaxWidth({
  children,
  max = 960,
  px = "md",
}: {
  children: React.ReactNode;
  max?: number | string;
  px?: string | number;
}) {
  return (
    <Box mx="auto" px={px} maw={max} w="100%">
      {children}
    </Box>
  );
}

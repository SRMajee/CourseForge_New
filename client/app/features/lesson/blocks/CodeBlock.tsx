import { Box } from "@chakra-ui/react";

export const CodeBlock = ({
  code,
  language = "text",
}: {
  code: string;
  language?: string;
}) => {
  return (
    <Box
      as="pre"
      p={4}
      my={4}
      rounded="md"
      bg="gray.900"
      color="green.300"
      overflowX="auto"
      fontFamily="mono"
      fontSize="sm"
    >
      {/* In a real app, use Prism.js or react-syntax-highlighter here */}
      <code>{code}</code>
    </Box>
  );
};

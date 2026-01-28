import { Text } from "@chakra-ui/react";

export const TextBlock = ({ content }: { content: string }) => {
  return (
    <Text fontSize="lg" lineHeight="tall" my={4}>
      {content}
    </Text>
  );
};

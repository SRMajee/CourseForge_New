import {
  Box,
  Heading,
  SimpleGrid,
  Center,
  Spinner,
  Text,
  Input,
  HStack,
  Icon,
  Button,
} from "@chakra-ui/react";
import { useState } from "react";
import { useCourses } from "~/features/course/hooks/useCourses";
import { CourseCard } from "~/features/course/components/CourseCard";
import { FaSearch } from "react-icons/fa";
import { CreateCourseModal } from "~/features/course/components/CreateCourseModal";

export default function MyCourses() {
  const { data: courses, isLoading } = useCourses();
  const [search, setSearch] = useState("");
  const [isModalOpen, setModalOpen] = useState(false); // <--- State for Modal

  // Filter logic (Client-side for now)
  const filteredCourses = courses?.filter(
    (c: { title: string; tags: any[] }) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())),
  );

  if (isLoading) {
    return (
      <Center h="50vh">
        <Spinner size="xl" color="brand.500" />
      </Center>
    );
  }

  return (
    <Box>
      <HStack justify="space-between" mb={8} wrap="wrap" gap={4}>
        <Heading size="2xl">My Library</Heading>

        {/* Search Bar */}
        <Box w={{ base: "full", md: "320px" }} position="relative">
          <Input
            placeholder="Search courses..."
            pl={10}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            bg="bg.panel"
          />
          <Icon
            position="absolute"
            left={3}
            top="50%"
            transform="translateY(-50%)"
            color="fg.muted"
          >
            <FaSearch />
          </Icon>
        </Box>
      </HStack>

      {!filteredCourses?.length ? (
        <Center
          h="40vh"
          flexDirection="column"
          gap={4}
          borderWidth="1px"
          borderStyle="dashed"
          borderRadius="lg"
        >
          <Text color="fg.muted" fontSize="lg">
            No courses found.
          </Text>
          <Text fontSize="sm" color="fg.muted">
            Try adjusting your search or generate a new course.
          </Text>

          {/* Empty State Trigger */}
          <Button variant="outline" mt={2} onClick={() => setModalOpen(true)}>
            Create your first course
          </Button>
        </Center>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
          {filteredCourses.map((course: any) => (
            <CourseCard key={course._id} course={course} />
          ))}
        </SimpleGrid>
      )}

      {/* The Modal Component */}
      <CreateCourseModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
      />
    </Box>
  );
}

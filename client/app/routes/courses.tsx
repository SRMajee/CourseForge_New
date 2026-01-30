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
  IconButton,
} from "@chakra-ui/react";
import { useState } from "react";
import { useCourses } from "~/features/course/hooks/useCourses";
import { CourseCard } from "~/features/course/components/CourseCard";
import { FaSearch, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import { CreateCourseModal } from "~/features/course/components/CreateCourseModal";

export default function MyCourses() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [isModalOpen, setModalOpen] = useState(false);

  // ✅ Pass page & limit to hook
  // Ensure your useCourses hook is updated to accept these args!
  const { data: response, isLoading } = useCourses(page, 9);

  // ✅ Handle new response structure { data: [], meta: {} }
  const courses = response?.data || [];
  const meta = response?.meta || {
    totalPages: 1,
    hasNextPage: false,
    hasPrevPage: false,
  };

  // Filter logic (Client-side for now)
  const filteredCourses = courses?.filter(
    (c: { title: string; tags: any[] }) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.tags.some((t: string) =>
        t.toLowerCase().includes(search.toLowerCase()),
      ),
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
            placeholder="Search visible courses..."
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
            No courses found on this page.
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
        <Box>
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={6}>
            {filteredCourses.map((course: any) => (
              <CourseCard key={course._id} course={course} />
            ))}
          </SimpleGrid>

          {/* ✅ Pagination Controls */}
          {meta.totalPages > 1 && (
            <HStack justify="center" gap={4} py={8}>
              <IconButton
                aria-label="Previous Page"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!meta.hasPrevPage}
                variant="outline"
              >
                <FaChevronLeft />
              </IconButton>

              <Text fontWeight="bold" color="fg.muted">
                Page {meta.page} of {meta.totalPages}
              </Text>

              <IconButton
                aria-label="Next Page"
                onClick={() => setPage((p) => p + 1)}
                disabled={!meta.hasNextPage}
                variant="outline"
              >
                <FaChevronRight />
              </IconButton>
            </HStack>
          )}
        </Box>
      )}

      {/* The Modal Component */}
      <CreateCourseModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
      />
    </Box>
  );
}

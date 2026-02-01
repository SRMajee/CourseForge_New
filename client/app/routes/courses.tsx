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
  Container,
} from "@chakra-ui/react";
import { useState, useEffect } from "react";
import { useInView } from "react-intersection-observer";
import { useCourses } from "~/features/course/hooks/useCourses";
import { CourseCard } from "~/features/course/components/CourseCard";
import { FaSearch } from "react-icons/fa";
import { CreateCourseModal } from "~/features/course/components/CreateCourseModal";

export default function MyCourses() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [allCourses, setAllCourses] = useState<any[]>([]);
  const [isModalOpen, setModalOpen] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Infinite Scroll Hook
  const { ref, inView } = useInView();

  // Fetch Logic
  const { data: response, isLoading, isFetching } = useCourses(page, 9);

  // 1. Reset list on search change
  useEffect(() => {
    setAllCourses([]);
    setPage(1);
    setHasMore(true);
  }, [search]);

  // 2. Accumulate Data
  useEffect(() => {
    if (response?.data) {
      const newCourses = response.data;

      setAllCourses((prev) => {
        // Dedup logic based on _id
        const existingIds = new Set(prev.map((c) => c._id));
        const uniqueNew = newCourses.filter(
          (c: any) => !existingIds.has(c._id),
        );
        return [...prev, ...uniqueNew];
      });

      // Stop if reached end
      if (response.meta && page >= response.meta.totalPages) {
        setHasMore(false);
      }
    }
  }, [response, page]);

  // 3. Load More Trigger
  useEffect(() => {
    if (inView && hasMore && !isFetching) {
      setPage((prev) => prev + 1);
    }
  }, [inView, hasMore, isFetching]);

  // Client-side filtering for active search
  const displayCourses = allCourses.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.tags.some((t: string) =>
        t.toLowerCase().includes(search.toLowerCase()),
      ),
  );

  return (
    <Container maxW="container.xl" py={8}>
      <HStack justify="space-between" mb={8} wrap="wrap" gap={4}>
        <Heading size="3xl" fontWeight="black" letterSpacing="tight">
          My Library
        </Heading>

        {/* Glass Search Bar */}
        <Box w={{ base: "full", md: "320px" }} position="relative">
          <Input
            placeholder="Search your library..."
            pl={10}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            // Liquid Glass Style
            bg="whiteAlpha.200"
            _dark={{ bg: "whiteAlpha.100" }}
            backdropFilter="blur(10px)"
            border="none"
            ring="1px"
            ringColor="whiteAlpha.300"
            rounded="full"
            _focus={{ ringColor: "blue.400", bg: "whiteAlpha.300" }}
          />
          <Icon
            position="absolute"
            left={4}
            top="50%"
            transform="translateY(-50%)"
            color="fg.muted"
          >
            <FaSearch />
          </Icon>
        </Box>
      </HStack>

      {/* Course Grid */}
      <Box minH="50vh">
        {displayCourses.length === 0 && !isLoading ? (
          <Center
            h="40vh"
            flexDirection="column"
            gap={4}
            rounded="3xl"
            bg="whiteAlpha.100"
            borderWidth="1px"
            borderColor="whiteAlpha.200"
            borderStyle="dashed"
          >
            <Text color="fg.muted" fontSize="lg">
              {search ? "No matches found." : "Your library is empty."}
            </Text>
            {!search && (
              <Button
                variant="surface"
                colorPalette="blue"
                onClick={() => setModalOpen(true)}
                rounded="full"
              >
                Create New Course
              </Button>
            )}
          </Center>
        ) : (
          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={8}>
            {displayCourses.map((course) => (
              <CourseCard key={course._id} course={course} />
            ))}
          </SimpleGrid>
        )}

        {/* Infinite Scroll Loader */}
        {hasMore && (
          <Center py={10} ref={ref}>
            {isFetching && <Spinner size="lg" color="blue.500" />}
          </Center>
        )}
      </Box>

      <CreateCourseModal
        isOpen={isModalOpen}
        onClose={() => setModalOpen(false)}
      />
    </Container>
  );
}

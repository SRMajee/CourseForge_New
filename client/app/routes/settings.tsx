import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Avatar,
  Button,
  Input,
  Spinner,
  Badge,
  Table,
  Icon,
  Container,
} from "@chakra-ui/react";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuthStore } from "~/store/authStore";
import { useConfigStore } from "~/store/configStore";
import { useState, useEffect } from "react";
import { api } from "~/services/api";
import { toaster } from "~/components/ui/toaster";
import { TopUpModal } from "~/features/payment/components/TopUpModal";
import { FaCoins, FaInfoCircle, FaCheckCircle, FaCrown } from "react-icons/fa";
import { ManageSubscriptionModal } from "~/features/subscription/components/ManageSubscriptionModal";

export default function Settings() {
  const { user: auth0User, isLoading: isAuthLoading } = useAuth0();
  const { user: dbUser, setUser } = useAuthStore();
  const { config, isLoading: isConfigLoading } = useConfigStore();

  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTopUpOpen, setTopUpOpen] = useState(false);
  const [isSubModalOpen, setSubModalOpen] = useState(false);

  useEffect(() => {
    if (dbUser?.name) setName(dbUser.name);
    else if (auth0User?.name) setName(auth0User.name);
  }, [dbUser, auth0User]);

  const user = dbUser || auth0User;
  const isPro =
    dbUser?.planType?.toUpperCase() === "PRO" ||
    dbUser?.subscriptionStatus === "active";

  const COST_MENU = [
    {
      action: "Create Course Outline",
      cost: config?.costs.createCourse || "...",
      desc: "Generates modules & lesson titles",
    },
    {
      action: "Generate Lesson Content",
      cost: config?.costs.generateLesson || "...",
      desc: "AI writes the full lesson text",
    },
    {
      action: "Generate Audio Summary",
      cost: config?.costs.generateAudio || "...",
      desc: "High-quality Neural TTS audio",
    },
    {
      action: "Export PDF",
      cost: config?.costs.exportPdf || "...",
      desc: "Downloadable course document",
    },
  ];

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      const res = await api.patch("/auth/profile", { name });
      setUser(res.data.user);
      toaster.create({
        title: "Success",
        description: "Profile updated.",
        type: "success",
      });
    } catch (error) {
      toaster.create({
        title: "Error",
        description: "Failed to update.",
        type: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isAuthLoading || isConfigLoading)
    return (
      <Box p={10}>
        <Spinner size="xl" />
      </Box>
    );
  if (!user) return null;

  // ✅ LIQUID GLASS PANEL
  const GlassPanel = ({ children }: { children: React.ReactNode }) => (
    <Box
      p={8}
      rounded="3xl"
      bg="whiteAlpha.600"
      _dark={{ bg: "whiteAlpha.50" }}
      backdropFilter="blur(24px) saturate(180%)"
      borderWidth="1px"
      borderColor="whiteAlpha.300"
      shadow="xl"
      transition="transform 0.2s"
    >
      {children}
    </Box>
  );

  return (
    <Container maxW="container.md" py={10}>
      <VStack align="start" mb={8}>
        <Heading size="3xl">Settings</Heading>
        <Text color="fg.muted" fontSize="lg">
          Manage your account and billing preferences.
        </Text>
      </VStack>

      <VStack gap={6} align="stretch">
        <GlassPanel>
          <HStack justify="space-between" mb={6}>
            <Heading size="md">Profile Details</Heading>
          </HStack>
          <HStack gap={6} align="start" flexWrap="wrap">
            <Avatar.Root size="2xl" ring="4px" ringColor="whiteAlpha.400">
              <Avatar.Fallback>
                {user.name?.substring(0, 2).toUpperCase()}
              </Avatar.Fallback>
              <Avatar.Image src={user.picture} />
            </Avatar.Root>
            <VStack flex="1" align="stretch" gap={4}>
              <Box>
                <Text fontSize="sm" fontWeight="bold" mb={1} color="fg.subtle">
                  Display Name
                </Text>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  variant="subtle"
                  bg="blackAlpha.50"
                  _dark={{ bg: "whiteAlpha.100" }}
                  rounded="xl"
                />
              </Box>
              <Box>
                <Text fontSize="sm" fontWeight="bold" mb={1} color="fg.subtle">
                  Email Address
                </Text>
                <Input
                  defaultValue={user.email}
                  disabled
                  variant="subtle"
                  opacity={0.7}
                  rounded="xl"
                />
              </Box>
              <Box pt={2}>
                <Button
                  colorPalette="blue"
                  onClick={handleSave}
                  loading={isSaving}
                  rounded="xl"
                  px={8}
                >
                  Save Changes
                </Button>
              </Box>
            </VStack>
          </HStack>
        </GlassPanel>

        <GlassPanel>
          <HStack justify="space-between" mb={6}>
            <Heading size="md">Plan & Usage</Heading>
            <Badge
              colorPalette={isPro ? "purple" : "blue"}
              variant="solid"
              size="lg"
              px={3}
              rounded="full"
            >
              {isPro ? "PRO PLAN" : "FREE PLAN"}
            </Badge>
          </HStack>

          <HStack
            justify="space-between"
            bgGradient={isPro ? "to-r" : "to-r"}
            gradientFrom={isPro ? "purple.500/10" : "blue.500/10"}
            gradientTo={isPro ? "purple.500/5" : "blue.500/5"}
            p={6}
            rounded="2xl"
            borderWidth="1px"
            borderColor={isPro ? "purple.500/20" : "blue.500/20"}
            mb={6}
          >
            <VStack align="start" gap={1}>
              <HStack color={isPro ? "purple.400" : "blue.400"}>
                {isPro ? <FaCrown /> : <FaCoins />}
                <Text fontWeight="bold" fontSize="lg">
                  {isPro ? "Pro Active" : "Available Credits"}
                </Text>
              </HStack>
              <Text fontSize="sm" color="fg.muted" maxW="300px">
                {isPro
                  ? `Your monthly credits reset on the billing date.`
                  : `Upgrade to Pro for more credits & GPT-4 access.`}
              </Text>
            </VStack>

            <VStack align="end" gap={0}>
              <Heading size="4xl" color={isPro ? "purple.400" : "blue.400"}>
                {dbUser?.credits || 0}
              </Heading>
              <Text
                fontSize="xs"
                fontWeight="bold"
                letterSpacing="widest"
                opacity={0.6}
              >
                BALANCE
              </Text>
            </VStack>
          </HStack>

          <VStack w="full" gap={3}>
            {isPro ? (
              <>
                <Button
                  w="full"
                  variant="subtle"
                  colorPalette="green"
                  disabled
                  rounded="xl"
                >
                  <FaCheckCircle /> You are a PRO Member
                </Button>
                <HStack w="full">
                  <Button
                    flex={1}
                    variant="outline"
                    onClick={() => setSubModalOpen(true)}
                    rounded="xl"
                  >
                    Manage Plan
                  </Button>
                  <Button
                    flex={1}
                    colorPalette="purple"
                    variant="surface"
                    onClick={() => setTopUpOpen(true)}
                    rounded="xl"
                  >
                    <FaCoins /> Buy Credits
                  </Button>
                </HStack>
              </>
            ) : (
              <Button
                w="full"
                colorPalette="blue"
                size="lg"
                onClick={() => setTopUpOpen(true)}
                rounded="xl"
                shadow="md"
              >
                <FaCrown /> Upgrade to Pro
              </Button>
            )}
          </VStack>
        </GlassPanel>

        <GlassPanel>
          <HStack gap={2} mb={4}>
            <Icon color="fg.muted">
              <FaInfoCircle />
            </Icon>
            <Heading
              size="sm"
              color="fg.muted"
              textTransform="uppercase"
              letterSpacing="wide"
            >
              Credit Usage Guide
            </Heading>
          </HStack>

          <Table.Root size="sm" interactive>
            <Table.Header>
              <Table.Row bg="transparent">
                <Table.ColumnHeader color="fg.subtle" pl={0}>
                  Action
                </Table.ColumnHeader>
                <Table.ColumnHeader color="fg.subtle">
                  Description
                </Table.ColumnHeader>
                <Table.ColumnHeader textAlign="end" color="fg.subtle" pr={0}>
                  Cost
                </Table.ColumnHeader>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {COST_MENU.map((item) => (
                <Table.Row
                  key={item.action}
                  bg="transparent"
                  _hover={{ bg: "whiteAlpha.100" }}
                >
                  <Table.Cell fontWeight="medium" pl={0}>
                    {item.action}
                  </Table.Cell>
                  <Table.Cell color="fg.muted">{item.desc}</Table.Cell>
                  <Table.Cell textAlign="end" pr={0}>
                    <Badge colorPalette="gray" variant="surface" rounded="md">
                      {item.cost}
                    </Badge>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Root>
        </GlassPanel>
      </VStack>

      <TopUpModal
        isOpen={isTopUpOpen}
        onClose={() => setTopUpOpen(false)}
        initialTab={isPro ? "credits" : "plan"}
      />
      <ManageSubscriptionModal
        isOpen={isSubModalOpen}
        onClose={() => setSubModalOpen(false)}
      />
    </Container>
  );
}

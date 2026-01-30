import {
  Box,
  Heading,
  Text,
  VStack,
  HStack,
  Avatar,
  Button,
  Input,
  Card,
  Spinner,
  Badge,
  Table,
  Icon,
} from "@chakra-ui/react";
import { useAuth0 } from "@auth0/auth0-react";
import { useAuthStore } from "~/store/authStore";
import { useConfigStore } from "~/store/configStore"; // 👈 Import Config Store
import { useState, useEffect } from "react";
import { api } from "~/services/api";
import { toaster } from "~/components/ui/toaster";
import { TopUpModal } from "~/features/payment/components/TopUpModal";
import { FaCoins, FaInfoCircle, FaCheckCircle, FaCrown } from "react-icons/fa";
import { ManageSubscriptionModal } from "~/features/subscription/components/ManageSubscriptionModal";

export default function Settings() {
  const { user: auth0User, isLoading: isAuthLoading } = useAuth0();
  const { user: dbUser, setUser } = useAuthStore();
  const { config, isLoading: isConfigLoading } = useConfigStore(); // 👈 Use Config

  const [name, setName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isTopUpOpen, setTopUpOpen] = useState(false);
  const [isSubModalOpen, setSubModalOpen] = useState(false);

  useEffect(() => {
    if (dbUser?.name) setName(dbUser.name);
    else if (auth0User?.name) setName(auth0User.name);
  }, [dbUser, auth0User]);

  const user = dbUser || auth0User;

  // 👇 Dynamic Plan Logic (Case-insensitive safety)
  const isPro =
    dbUser?.planType?.toUpperCase() === "PRO" ||
    dbUser?.subscriptionStatus === "active";

  // 👇 Generate COST_MENU dynamically from Store
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

  if (isAuthLoading || isConfigLoading) {
    return (
      <Box p={10}>
        <Spinner size="xl" />
      </Box>
    );
  }

  if (!user) return null;

  return (
    <Box maxW="container.md">
      <Heading size="2xl" mb={2}>
        Settings
      </Heading>
      <Text color="fg.muted" mb={8}>
        Manage your account and billing.
      </Text>

      <VStack gap={8} align="stretch">
        {/* --- PROFILE CARD --- */}
        <Card.Root variant="outline">
          <Card.Header>
            <Heading size="md">Profile Details</Heading>
          </Card.Header>
          <Card.Body>
            <HStack gap={6} align="start">
              <Avatar.Root size="2xl">
                <Avatar.Fallback>
                  {user.name?.substring(0, 2).toUpperCase()}
                </Avatar.Fallback>
                <Avatar.Image src={user.picture} />
              </Avatar.Root>
              <VStack flex="1" align="stretch">
                <Box>
                  <Text fontSize="sm" fontWeight="medium">
                    Full Name
                  </Text>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Box>
                <Box>
                  <Text fontSize="sm" fontWeight="medium">
                    Email
                  </Text>
                  <Input defaultValue={user.email} disabled bg="bg.subtle" />
                </Box>
              </VStack>
            </HStack>
          </Card.Body>
          <Card.Footer>
            <HStack w="full" justify="flex-end">
              <Button
                colorPalette="blue"
                onClick={handleSave}
                loading={isSaving}
              >
                Save Changes
              </Button>
            </HStack>
          </Card.Footer>
        </Card.Root>

        {/* --- PLAN & CREDITS CARD --- */}
        <Card.Root variant="outline">
          <Card.Header>
            <HStack justify="space-between">
              <Heading size="md">Plan & Credits</Heading>
              {/* 👇 Dynamic Badge */}
              <Badge
                colorPalette={isPro ? "purple" : "blue"}
                variant="solid"
                size="lg"
              >
                {isPro ? "PRO PLAN" : "FREE PLAN"}
              </Badge>
            </HStack>
          </Card.Header>
          <Card.Body>
            <HStack
              justify="space-between"
              bg={isPro ? "purple.50" : "blue.50"}
              _dark={{ bg: isPro ? "purple.900/20" : "blue.900/20" }}
              p={6}
              rounded="xl"
              borderWidth="1px"
              borderColor={isPro ? "purple.100" : "blue.100"}
            >
              <VStack align="start" gap={1}>
                <HStack color={isPro ? "purple.600" : "blue.600"}>
                  {isPro ? <FaCrown /> : <FaCoins />}
                  <Text fontWeight="bold">
                    {isPro ? "Pro Status Active" : "Available Credits"}
                  </Text>
                </HStack>
                <Text fontSize="sm" color="fg.muted">
                  {isPro
                    ? `Your monthly credits (${config?.pricing.pro.credits || 1000}) reset on the billing date.`
                    : `Upgrade to Pro for ${config?.pricing.pro.credits || 1000} credits/mo & GPT-4 Access.`}
                </Text>
              </VStack>

              <VStack align="end" gap={0}>
                <Heading size="3xl" color={isPro ? "purple.600" : "blue.600"}>
                  {dbUser?.credits || 0}
                </Heading>
                <Text fontSize="xs" fontWeight="bold" color="fg.muted">
                  BALANCE
                </Text>
              </VStack>
            </HStack>
          </Card.Body>
          <Card.Footer>
            <VStack w="full" gap={2}>
              {/* ✅ SHOW THIS IF ALREADY PRO */}
              {isPro ? (
                <>
                  <Button
                    w="full"
                    variant="surface"
                    colorPalette="green"
                    disabled
                  >
                    <FaCheckCircle /> You are already a PRO Member
                  </Button>
                  <Button variant="ghost" onClick={() => setSubModalOpen(true)}>
                    Manage Plan
                  </Button>
                  <Button
                    w="full"
                    colorPalette="purple"
                    variant="outline"
                    onClick={() => setTopUpOpen(true)}
                  >
                    <FaCoins /> Buy Extra Top-up Credits
                  </Button>
                </>
              ) : (
                /* ✅ SHOW THIS IF FREE */
                <Button
                  w="full"
                  colorPalette="yellow"
                  onClick={() => setTopUpOpen(true)}
                >
                  <FaCrown /> Upgrade to Pro
                </Button>
              )}
            </VStack>
          </Card.Footer>
        </Card.Root>

        {/* --- COST TABLE (Now powered by Backend Config) --- */}
        <Card.Root variant="outline">
          <Card.Header>
            <HStack gap={2}>
              <Icon color="gray.500">
                <FaInfoCircle />
              </Icon>
              <Heading size="md">Credit Usage Guide</Heading>
            </HStack>
          </Card.Header>
          <Card.Body>
            <Table.Root size="sm" striped>
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeader>Action</Table.ColumnHeader>
                  <Table.ColumnHeader>Description</Table.ColumnHeader>
                  <Table.ColumnHeader textAlign="end">Cost</Table.ColumnHeader>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {COST_MENU.map((item) => (
                  <Table.Row key={item.action}>
                    <Table.Cell fontWeight="medium">{item.action}</Table.Cell>
                    <Table.Cell color="fg.muted">{item.desc}</Table.Cell>
                    <Table.Cell textAlign="end">
                      <Badge colorPalette="gray" variant="surface">
                        {item.cost}
                      </Badge>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          </Card.Body>
        </Card.Root>
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
    </Box>
  );
}

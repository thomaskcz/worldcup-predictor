import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const NICKNAME_MIN_LENGTH = 3;
const NICKNAME_MAX_LENGTH = 20;
const NICKNAME_PATTERN = /^[A-Za-z0-9_-]+$/;

/**
 * Validates a nickname for format and length
 */
function validateNickname(nickname: string): {
  valid: boolean;
  error?: string;
} {
  const trimmed = nickname.trim();

  if (trimmed.length < NICKNAME_MIN_LENGTH) {
    return {
      valid: false,
      error: `Nickname must be at least ${NICKNAME_MIN_LENGTH} characters`,
    };
  }

  if (trimmed.length > NICKNAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `Nickname must be at most ${NICKNAME_MAX_LENGTH} characters`,
    };
  }

  if (!NICKNAME_PATTERN.test(trimmed)) {
    return {
      valid: false,
      error:
        "Nickname can only contain letters, numbers, underscores, and hyphens",
    };
  }

  return { valid: true };
}

/**
 * PUT /api/user/nickname
 * Updates the authenticated user's nickname
 *
 * Body: { "nickname": "string" }
 *
 * Response:
 * - 200: { success: true, nickname: "string" }
 * - 400: { success: false, error: "string" }
 * - 409: { success: false, error: "Nickname already taken" }
 * - 401: { success: false, error: "Not authenticated" }
 */
export async function PUT(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Silently fail - can happen in edge cases
            }
          },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { nickname } = body as { nickname?: string };

    if (!nickname || typeof nickname !== "string") {
      return NextResponse.json(
        { success: false, error: "Nickname is required" },
        { status: 400 }
      );
    }

    // Validate nickname format
    const trimmedNickname = nickname.trim();
    const validation = validateNickname(trimmedNickname);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    // Ensure nickname uniqueness in a case-insensitive way
    const { data: existing, error: lookupError } = await supabase
      .from("users_profiles")
      .select("id")
      .ilike("nickname", trimmedNickname)
      .neq("id", user.id)
      .maybeSingle();

    if (lookupError) {
      console.error("Supabase lookup error:", lookupError);
      return NextResponse.json(
        { success: false, error: "Failed to validate nickname uniqueness" },
        { status: 500 }
      );
    }

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Nickname already taken" },
        { status: 409 }
      );
    }

    // Update user profile with exact case preserved
    const { data, error } = await supabase
      .from("users_profiles")
      .update({ nickname: trimmedNickname })
      .eq("id", user.id)
      .select("nickname")
      .single();

    if (error) {
      // Check if it's a uniqueness constraint error
      if (error.code === "23505") {
        return NextResponse.json(
          { success: false, error: "Nickname already taken" },
          { status: 409 }
        );
      }

      console.error("Supabase error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to update nickname" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        nickname: data.nickname,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/nickname
 * Gets the authenticated user's current profile including nickname
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Silently fail
            }
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Not authenticated" },
        { status: 401 }
      );
    }

    const { data: profile, error } = await supabase
      .from("users_profiles")
      .select("email, nickname")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Supabase error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to fetch profile" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        profile,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

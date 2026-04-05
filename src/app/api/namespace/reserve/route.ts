import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { validateSlug } from "@/lib/slug-validation";

/**
 * POST /api/namespace/reserve
 *
 * 네임스페이스 예약 (이메일 수집). 결제 없이 수요 검증용.
 *
 * Request:  { name: string, email: string }
 * Response: 200 { name, email, message }
 *           409 { error }
 *           422 { error }
 */
export async function POST(request: NextRequest) {
  const { name, email } = await request.json().catch(() => ({
    name: "",
    email: "",
  }));

  // 이름 유효성 검증
  const nameCheck = validateSlug(name);
  if (!nameCheck.valid) {
    return NextResponse.json({ error: nameCheck.error }, { status: 422 });
  }

  // 이메일 유효성 검증
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "올바른 이메일을 입력해주세요." },
      { status: 422 }
    );
  }

  let supabase;
  try {
    supabase = getSupabase();
  } catch (e) {
    return NextResponse.json(
      { error: "서버 설정 오류: " + (e instanceof Error ? e.message : String(e)) },
      { status: 500 }
    );
  }

  // 이미 예약된 이름 확인
  const { data: existing } = await supabase
    .from("namespace_reservations")
    .select("id")
    .eq("name", name)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "이미 예약된 이름입니다. 다른 이름을 시도해보세요." },
      { status: 409 }
    );
  }

  // 예약 생성
  const { error } = await supabase
    .from("namespace_reservations")
    .insert({ name, email });

  if (error) {
    console.error("Reservation failed:", error);
    return NextResponse.json(
      { error: "예약에 실패했습니다: " + error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    name,
    email,
    message: `좌표.to/${name} 예약이 완료되었습니다! 서비스 오픈 시 안내 메일을 보내드리겠습니다.`,
  });
}

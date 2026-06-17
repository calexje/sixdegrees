import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    origin: "Andriy Shevchenko",
    target: "Rio Ngumoha",
  });
}
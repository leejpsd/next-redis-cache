"use server";

import { revalidateTag } from "next/cache";

export async function invalidateRandomUser() {
  // 그리고 캐시 무효화
  revalidateTag("random-user", "max");
}

export async function postRandomUser() {
  const data = await fetch(
    "http://localhost:3000/api/revalidate?secret=eddy-test",
    {
      method: "POST",
      headers: {
        topic: "random-user/create",
      },
    }
  );

  const res = await data.json();
  console.log("eddy webhook response", res);
  return res;
}

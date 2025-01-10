import { useRouter } from "next/router";
import { useAuth, AuthProvider } from "v2/common/auth";

function Content() {
  const router = useRouter();
  const [, { verifyOtpWithLink }] = useAuth();

  const token = router.query.token_hash as string;
  const lang = router.query.lang as string;
  if (token && lang) {
    verifyOtpWithLink(token, lang).then(() => {
      router.replace("/v2");
    });
  }

  return null;
}

export default function VerifyPage() {
  return (
    <AuthProvider>
      <Content />
    </AuthProvider>
  );
}

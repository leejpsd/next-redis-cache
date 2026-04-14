import { ClientFetchedRandomUserClient } from "../components/ClientFetchedRandomUserClient";

export default function CsrExperimentPage() {
  return (
    <ClientFetchedRandomUserClient
      eyebrow="Experiment / CSR"
      title="Direct client call baseline"
      description="초기 HTML에는 데이터가 없고, 브라우저가 hydrate 된 뒤 외부 origin을 직접 호출해 데이터를 채웁니다. 프론트 서버 렌더 비용을 줄이는 대신, 브라우저가 네트워크와 데이터 shape를 직접 감당하는 방식입니다."
      strategySummary="이 경로는 '그냥 CSR로 다 던지면 서버 비용이 줄지 않나?'라는 질문의 기준선입니다. 이후 BFF, SSR, ISR(fetch), shared cache와 비교하면서 사용자 경험과 전체 시스템 비용을 같이 보게 됩니다."
      endpoint="https://randomuser.me/api"
      mode="direct-client"
    />
  );
}

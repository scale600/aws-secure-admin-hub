# AWS Secure Admin Hub — 프로젝트 개발 문서

---

## 1. 프로젝트 기본 정보

| 항목 | 내용 |
|------|------|
| 프로젝트명 | AWS Secure Admin Hub |
| 도메인 | aws.techcloudup.com |
| 라이브 URL | https://aws.techcloudup.com |
| GitHub | https://github.com/[your-handle]/aws-secure-admin-hub |
| 타겟 포지션 | AWS Cloud Admin / Cloud Operations Engineer / SRE / DevOps (Mid~Senior) |

---

## 2. 프로젝트 취지

단순한 데모 사이트가 아니라, **AWS Cloud Admin으로서의 실전 경험을 증명하는 라이브 포트폴리오**입니다.

- AWS Security, Compute, Networking, Storage, Monitoring, Automation 등 Cloud Admin이 실제로 다루는 전 영역을 직접 구현
- 이론 설명이 아닌, 구현·운영 경험을 인터뷰어에게 생생하게 전달
- Least Privilege, Secure Access, Operational Excellence 등 **AWS Well-Architected Framework** 실제 적용 사례 제시
- Free Tier 활용으로 최소 비용, 최대 실재감(Realism) 달성

---

## 3. 프로젝트 목표

1. AWS Admin의 일상적인 업무 흐름을 웹으로 재현
2. **Security(보안)** 와 **Operations(운영)** 의 균형을 명시적으로 강조
3. 실제 AWS 서비스와 연동해 Realism 극대화
4. GitHub + Live Demo 조합으로 포트폴리오 완성도 확보

---

## 4. 기술 아키텍처

### 스택 구성

```
[Browser]
    │
    ▼
[Next.js 14 / TypeScript / Tailwind CSS]  ← AWS Amplify Hosting (Free Tier)
    │
    ▼
[API Gateway (HTTP API)]  ──  [Amazon Cognito (Auth)]
    │
    ▼
[AWS Lambda (Node.js 20)]
    │
    ├── [DynamoDB]     ← Access Requests, Audit Logs (Permanent Free Tier)
    ├── [S3]           ← Static assets, CloudTrail logs, Policy templates
    ├── [CloudWatch]   ← 실제 Lambda/API GW 메트릭 읽기 (SDK)
    ├── [CloudTrail]   ← Trail 1개 활성화 → S3 저장 → Lambda 파싱
    └── [EC2]          ← t3.micro 1대 (평상시 STOPPED, 데모시 Start/Stop)
```

### 서비스 역할 요약

| AWS 서비스 | 역할 | 비용 |
|------------|------|------|
| Amplify Hosting | Next.js SSR/SSG 호스팅, CI/CD | $0 (Free Tier) |
| API Gateway (HTTP) | REST 엔드포인트, Lambda 트리거 | $0 (Free Tier) |
| Lambda (Node.js 20) | 비즈니스 로직, IAM Policy 생성, 메트릭 조회 | $0 (Free Tier) |
| DynamoDB | AccessRequests 테이블, TTL 활용 | $0 (Permanent Free) |
| Cognito User Pool | JWT 인증, Guest Mode 지원 | $0 (Free Tier) |
| S3 | 정적 파일, CloudTrail 로그 버킷 | $0 (Free Tier) |
| CloudTrail | Trail 1개 — 실제 API 이력 수집 | $0 (관리이벤트 무료) |
| CloudWatch | Lambda/API GW 실제 메트릭 시각화 | $0 (기본 메트릭 무료) |
| EC2 t3.micro | 데모용 인스턴스 (평상시 Stopped) | ~$0.64/월 (EBS만) |
| Route 53 | aws.techcloudup.com 호스팅존 | $0.50/월 |

**예상 월 비용: ~$1.14** (EC2 EBS $0.64 + Route 53 $0.50)

---

## 4-1. LIVE / DEMO 구분 원칙

> UI에 배지를 명시해 인터뷰어에게 투명하게 보여줌 — "뭐가 진짜인지 스스로 안다"는 것 자체가 어필 포인트

| 배지 | 의미 | 해당 기능 |
|------|------|-----------|
| 🟢 **LIVE** | 실제 AWS API 호출, 실제 데이터 | Access Requests, CloudTrail 로그, CloudWatch 메트릭, S3 버킷 정책, EC2 Start/Stop |
| 🔵 **DEMO** | 시뮬레이션 / 가상 데이터 | GuardDuty Findings, CPU/Network 차트, SSM Patch 시뮬레이션 |

### EC2 Start/Stop 흐름 (데모 핵심)
```
평상시:  STOPPED → 컴퓨팅 비용 $0, EBS $0.64/월만 발생
데모시:  [Start] 클릭
          → Lambda: ec2.startInstances()
          → 상태 Polling (pending → running)
          → UI 실시간 업데이트
          → 데모 종료 후 [Stop] → 다시 STOPPED
```
인터뷰 중 "지금 실제로 켜볼게요" 시연 가능 → 가장 강력한 실재감 증명

---

## 5. 주요 기능 (Features)

### 5-1. Admin Dashboard
- 🟢 **LIVE** 최근 Access Requests 건수 (DynamoDB 실제 쿼리)
- 🟢 **LIVE** Lambda 호출 횟수 / API GW 요청 수 (CloudWatch GetMetricData)
- 🔵 **DEMO** EC2 인스턴스 수, S3 버킷 수, Security Score (가상 요약 카드)
- 🔵 **DEMO** CPU / Network / Cost Trend 차트 (Recharts 가상 데이터)

### 5-2. EC2 Access Management ★ (핵심 기능)
| 단계 | 배지 | 내용 |
|------|------|------|
| 요청 폼 | 🟢 LIVE | 인스턴스 ID, 목적, 기간, 권한 수준 입력 |
| 저장 | 🟢 LIVE | DynamoDB AccessRequests 테이블 실제 저장 |
| 워크플로우 | 🟢 LIVE | Submit → Pending → Approved / Rejected 상태 전환 |
| Policy 생성 | 🟢 LIVE | Least Privilege IAM Policy JSON 자동 생성 (Lambda) |
| 접근 추천 | 🔵 DEMO | Session Manager > EC2 Instance Connect > SSH 안내 |

### 5-3. Security Center
- 🟢 **LIVE** CloudTrail Event Log: 실제 Trail 로그 → S3 → Lambda 파싱 → 뷰어 표시
- 🟢 **LIVE** IAM Policy Generator: Action/Resource/Condition 입력 → Least Privilege JSON 생성
- 🔵 **DEMO** GuardDuty Findings: 가상 보안 이벤트 (Severity: Low/Medium/High)
- 🔵 **DEMO** Security Best Practices Checklist: MFA, Root 잠금 등

### 5-4. Resource Management
| 리소스 | 배지 | 시연 내용 |
|--------|------|-----------|
| EC2 | 🟢 LIVE | 실제 t3.micro 인스턴스 Start/Stop (ec2.startInstances SDK) |
| EC2 상태 | 🟢 LIVE | Polling으로 pending → running 실시간 상태 표시 |
| S3 | 🟢 LIVE | 실제 버킷 GetBucketPolicy / GetPublicAccessBlock 조회 |
| VPC | 🔵 DEMO | VPC/Subnet/Security Group Overview (가상 구성도) |
| CloudWatch | 🟢 LIVE | Lambda/API GW 실제 메트릭 그래프 |

### 5-5. Automation Demo
- 🟢 **LIVE** Lambda 실행 이력: CloudWatch Logs 실제 조회
- 🔵 **DEMO** Systems Manager Patch Management 시뮬레이션

---

## 6. 데이터 모델 (DynamoDB)

### Table: `AccessRequests`

| 필드 | 타입 | 설명 |
|------|------|------|
| `requestId` | String (PK) | ULID 또는 UUID |
| `userId` | String | Cognito sub 또는 "guest" |
| `instanceId` | String | 예: i-0abc1234def |
| `purpose` | String | 접근 목적 (자유 입력) |
| `duration` | Number | 접근 허용 시간 (시간 단위) |
| `permissionLevel` | String | ReadOnly / PowerUser / Admin |
| `status` | String | Pending / Approved / Rejected |
| `requestedAt` | String | ISO 8601 타임스탬프 |
| `approvedAt` | String | 승인 처리 시각 (nullable) |
| `generatedPolicy` | String | 자동 생성된 IAM Policy JSON |
| `ttl` | Number | DynamoDB TTL (만료 자동 삭제) |

### GSI: `userId-requestedAt-index`
- userId로 사용자별 요청 이력 조회 지원

---

## 7. 개발 단계 (Phase)

### Phase 1 — Foundation (1주)
- [x] Next.js 14 (App Router) + TypeScript + Tailwind CSS 프로젝트 생성
- [x] AWS Amplify 초기화 및 배포 파이프라인 구성
- [x] 공통 레이아웃 (Sidebar Navigation, Header, Dark Mode)
- [x] Home / About Me 페이지

### Phase 2 — LIVE 백엔드 구축 (1.5주)
> 목표: 실제 AWS API 호출 기반 기능 완성

- [ ] Lambda + API Gateway (HTTP API) 연동
- [ ] DynamoDB AccessRequests 테이블 CRUD (요청 저장 / 상태 업데이트)
- [ ] IAM Policy Generator Lambda 함수 구현
- [ ] **CloudTrail Trail 활성화** → S3 버킷 연결 → Lambda로 로그 파싱
- [ ] **EC2 t3.micro 1대 프로비저닝** (평상시 Stopped 상태 유지)
- [ ] EC2 Start/Stop API 연동 + 상태 Polling 구현
- [ ] Cognito User Pool 설정 (Guest Mode fallback)

### Phase 3 — Resource Showcase (1주)
> 목표: LIVE 데이터 + DEMO 데이터 혼합, 배지 UI 적용

- [ ] Admin Dashboard
  - 🟢 LIVE: DynamoDB 요청 집계, CloudWatch 메트릭 카드
  - 🔵 DEMO: 가상 요약 카드 + Recharts 차트
- [ ] EC2 페이지: 실제 인스턴스 목록 + Start/Stop 버튼
- [ ] S3 페이지: 실제 버킷 정책 / PublicAccessBlock 조회
- [ ] CloudTrail 로그 뷰어 (실제 파싱 데이터)
- [ ] Security Center (IAM Generator LIVE, GuardDuty DEMO)
- [ ] Automation: Lambda 실행 로그 (CloudWatch Logs 실제 조회)

### Phase 4 — Polish & Deploy (0.5주)
- [ ] LIVE / DEMO 배지 UI 컴포넌트 전체 적용
- [ ] Responsive 디자인 점검 (Mobile, Tablet, Desktop)
- [ ] Custom Domain 연결 (Route 53 → Amplify)
- [ ] GitHub README 작성 (아키텍처 다이어그램 + LIVE/DEMO 구분 명시)
- [ ] Lighthouse 90점 이상 목표

---

## 8. 인터뷰 / 데모 시나리오 (3~4분)

```
1. Home 소개 (30초)
   "AWS Cloud Admin 역량을 직접 구현한 라이브 포트폴리오입니다."

2. Admin Dashboard (30초)
   EC2, S3, 비용, Security Score 요약 카드 및 실시간 차트 시연

3. EC2 Access Management (1분 30초) ★ 핵심
   - 접근 요청 폼 작성 (인스턴스 선택, 목적 입력, 기간 설정)
   - Submit → Pending → Approved 워크플로우 시연
   - 자동 생성된 IAM Policy JSON 확인
   - "Session Manager를 권장하는 이유" 설명 (No inbound port, audit trail)

4. Security Center (45초)
   - IAM Policy Generator: Least Privilege 원칙 설명
   - GuardDuty Findings: 이상 탐지 대응 흐름 설명
   - CloudTrail: "누가, 언제, 무엇을 했는가" 추적 설명

5. 마무리 (15초)
   "이 프로젝트를 통해 Security와 Operations를 동시에 고려하는
    Cloud Admin의 사고방식을 구현했습니다."
```

---

## 9. GitHub README 한 줄 요약

> **AWS Secure Admin Hub** is a live demo platform showcasing comprehensive AWS Cloud Administration — EC2 access control, IAM least-privilege policy generation, security monitoring, and resource management — built with Next.js 14, Lambda, DynamoDB, and AWS Amplify.

---

## 10. 전체 진행 체크리스트

> 위에서 아래로 순서대로 진행. 각 단계 완료 후 체크.

### 🏗️ Phase 1 — Foundation

- [ ] Next.js 14 (App Router) + TypeScript + Tailwind CSS 프로젝트 생성
- [ ] AWS Amplify 앱 생성 및 GitHub 연결 (CI/CD 파이프라인)
- [ ] 공통 레이아웃 구현 (Sidebar, Header, Dark Mode 토글)
- [ ] Home 페이지 작성
- [ ] About Me 페이지 작성
- [ ] Amplify로 첫 배포 확인 (임시 도메인)

---

### ⚙️ Phase 2 — LIVE 백엔드 구축

#### AWS 인프라 셋업
- [ ] DynamoDB 테이블 생성 (`AccessRequests`, TTL 설정, GSI 추가)
- [ ] Lambda 함수 생성 (Node.js 20, IAM Role 최소 권한 설정)
- [ ] API Gateway (HTTP API) 생성 → Lambda 연결
- [ ] Cognito User Pool 생성 (Guest Mode fallback 포함)
- [ ] S3 버킷 생성 (CloudTrail 로그용, 퍼블릭 액세스 차단)
- [ ] **CloudTrail Trail 활성화** → 위 S3 버킷으로 로그 전송
- [ ] **EC2 t3.micro 인스턴스 1대 생성** (Amazon Linux 2023, 기본 보안 그룹)
- [ ] EC2 Session Manager 연결 확인 (SSM Agent 설치 확인)
- [ ] EC2 인스턴스 Stopped 상태로 전환

#### 백엔드 기능 구현
- [ ] Access Request 생성 API (POST /requests → DynamoDB 저장)
- [ ] Access Request 목록 조회 API (GET /requests)
- [ ] Access Request 상태 변경 API (PATCH /requests/{id})
- [ ] IAM Policy Generator Lambda 함수 (Action/Resource/Condition → JSON 생성)
- [ ] EC2 Start API (ec2.startInstances → 상태 반환)
- [ ] EC2 Stop API (ec2.stopInstances → 상태 반환)
- [ ] EC2 상태 조회 API (ec2.describeInstances → 현재 상태 Polling)
- [ ] S3 버킷 정책 조회 API (s3.getBucketPolicy, s3.getPublicAccessBlock)
- [ ] CloudTrail 로그 파싱 Lambda (S3 이벤트 트리거 → DynamoDB 저장)
- [ ] CloudTrail 이벤트 목록 API (GET /cloudtrail/events)
- [ ] CloudWatch 메트릭 조회 API (Lambda 호출 수, API GW 요청 수)

---

### 🖥️ Phase 3 — 프론트엔드 페이지 구현

#### Admin Dashboard
- [ ] LIVE 카드: 최근 Access Request 건수 (DynamoDB 집계)
- [ ] LIVE 카드: Lambda 호출 횟수 / API GW 요청 수 (CloudWatch)
- [ ] DEMO 카드: EC2 수, S3 수, Security Score (가상 데이터)
- [ ] DEMO 차트: CPU / Network / Cost Trend (Recharts)
- [ ] LIVE/DEMO 배지 컴포넌트 구현

#### EC2 Access Management 페이지
- [ ] 접근 요청 폼 UI (인스턴스 ID, 목적, 기간, 권한 수준)
- [ ] 폼 제출 → API 호출 → DynamoDB 저장 연동
- [ ] 요청 목록 테이블 (상태별 색상 표시)
- [ ] Approve / Reject 버튼 → 상태 변경 API 연동
- [ ] 승인 시 IAM Policy JSON 생성 → 팝업 표시

#### Resource Management 페이지
- [ ] EC2 인스턴스 목록 (실제 DescribeInstances)
- [ ] Start/Stop 버튼 + 상태 Polling UI (pending → running 애니메이션)
- [ ] S3 버킷 목록 + 실제 버킷 정책 / PublicAccessBlock 표시
- [ ] VPC Overview (가상 구성도 DEMO)
- [ ] CloudWatch 메트릭 그래프 (실제 Lambda/API GW 지표)

#### Security Center 페이지
- [ ] CloudTrail 이벤트 로그 뷰어 (실제 파싱 데이터, 필터/검색)
- [ ] IAM Policy Generator UI (Action/Resource/Condition 입력폼 + JSON 출력)
- [ ] GuardDuty Findings 목록 (DEMO, Severity 필터)
- [ ] Security Best Practices Checklist

#### Automation Demo 페이지
- [ ] Lambda 함수 목록 + 실제 실행 이력 (CloudWatch Logs)
- [ ] SSM Patch Management 시뮬레이션 (DEMO)

---

### 🚀 Phase 4 — 배포 및 마무리

- [ ] LIVE / DEMO 배지 전체 페이지 일관성 점검
- [ ] Responsive 디자인 점검 (Mobile 375px, Tablet 768px, Desktop 1280px)
- [ ] Route 53 호스팅존 생성 (aws.techcloudup.com)
- [ ] Amplify Custom Domain 연결 + HTTPS 인증서 적용
- [ ] 환경변수 정리 (Amplify 환경변수로 AWS 리전, 테이블명 등 분리)
- [ ] GitHub README 작성
  - [ ] 프로젝트 소개 + 라이브 URL
  - [ ] 아키텍처 다이어그램 (draw.io 또는 diagrams-as-code)
  - [ ] LIVE / DEMO 기능 구분 표
  - [ ] 로컬 실행 방법
- [ ] Lighthouse 성능 점검 (목표: 90점 이상)
- [ ] 인터뷰 데모 리허설 (3~4분 플로우 연습)

---

## 11. 향후 확장 가능성 (Optional)

| 기능 | 설명 |
|------|------|
| Slack 알림 연동 | 접근 요청 승인 시 SNS → Lambda → Slack Webhook |
| EventBridge 스케줄러 | 만료된 접근 권한 자동 회수 시뮬레이션 |
| Cost Explorer 연동 | 실제 AWS 비용 데이터 시각화 (읽기 전용 IAM Role) |
| Terraform IaC | 인프라 코드화로 재현 가능성 증명 |
| Multi-account 시뮬레이션 | AWS Organizations 구조 데모 |

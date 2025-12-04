# API 비교 분석

## 날짜별 비교 (정상 작동)
- **쿼리**: 특정 날짜의 모든 회사 데이터 조회
- **비교**: 시작 날짜 vs 종료 날짜
- **결과**: ✅ 정상

## 종목 비교 (문제 발생)
- **쿼리**: 최신 날짜 + 과거 여러 날짜 조회
- **비교**: 오늘 vs 전일/1개월/3개월/1년
- **결과**: ❌ 대부분 "-" 표시

## 핵심 차이점

### date-comparison
```typescript
// 시작 날짜 데이터
.eq('scrape_date', actualStartDate)

// 종료 날짜 데이터  
.eq('scrape_date', actualEndDate)
```

### stock-comparison
```typescript
// 오늘 데이터
.eq('scrape_date', latestScrapeDate)

// 비교 데이터
.eq('scrape_date', prevDayDate)  // 문제!
```

## 의심되는 문제

**prevDayDate 계산 로직이 잘못되었을 가능성**
- `uniqueDates[1]`을 사용하는데, 이게 실제 데이터가 있는 날짜인지 확인 필요
- fnguide와 naver의 scrape_date가 다를 수 있음

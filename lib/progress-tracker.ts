/**
 * 데이터 수집 진행률 추적 유틸리티
 * Supabase에 실시간으로 진행률을 저장하고 조회
 */

import { supabaseAdmin } from './supabase';

export interface CollectionProgress {
  id?: string;
  session_id: string;
  collection_type: 'financial' | 'price';
  status: 'running' | 'completed' | 'failed';
  total_count: number;
  current_count: number;
  success_count: number;
  error_count: number;
  skip_count: number;
  current_item?: string;
  logs: string[];
  started_at?: string;
  updated_at?: string;
  completed_at?: string;
  error_message?: string;
}

export class ProgressTracker {
  private sessionId: string;
  private collectionType: 'financial' | 'price';
  private logs: string[] = [];
  private maxLogs = 20; // 최대 로그 개수

  constructor(sessionId: string, collectionType: 'financial' | 'price') {
    this.sessionId = sessionId;
    this.collectionType = collectionType;
  }

  /**
   * 진행률 초기화
   */
  async initialize(totalCount: number): Promise<void> {
    const { error } = await supabaseAdmin
      .from('collection_progress')
      .insert({
        session_id: this.sessionId,
        collection_type: this.collectionType,
        status: 'running',
        total_count: totalCount,
        current_count: 0,
        success_count: 0,
        error_count: 0,
        skip_count: 0,
        logs: JSON.stringify([this.addTimestamp('수집 시작')])
      });

    if (error) {
      console.error('Failed to initialize progress:', error);
    }
  }

  /**
   * 진행률 업데이트
   */
  async update(data: {
    current_count?: number;
    success_count?: number;
    error_count?: number;
    skip_count?: number;
    current_item?: string;
    log?: string;
  }): Promise<void> {
    // 로그 추가
    if (data.log) {
      this.logs.push(this.addTimestamp(data.log));
      // 최대 개수 유지
      if (this.logs.length > this.maxLogs) {
        this.logs = this.logs.slice(-this.maxLogs);
      }
    }

    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (data.current_count !== undefined) updateData.current_count = data.current_count;
    if (data.success_count !== undefined) updateData.success_count = data.success_count;
    if (data.error_count !== undefined) updateData.error_count = data.error_count;
    if (data.skip_count !== undefined) updateData.skip_count = data.skip_count;
    if (data.current_item !== undefined) updateData.current_item = data.current_item;
    if (this.logs.length > 0) updateData.logs = JSON.stringify(this.logs);

    const { error } = await supabaseAdmin
      .from('collection_progress')
      .update(updateData)
      .eq('session_id', this.sessionId);

    if (error) {
      console.error('Failed to update progress:', error);
    }
  }

  /**
   * 완료 처리
   */
  async complete(finalCounts: {
    success_count: number;
    error_count: number;
    skip_count: number;
  }): Promise<void> {
    this.logs.push(this.addTimestamp('✅ 수집 완료'));

    const { error } = await supabaseAdmin
      .from('collection_progress')
      .update({
        status: 'completed',
        success_count: finalCounts.success_count,
        error_count: finalCounts.error_count,
        skip_count: finalCounts.skip_count,
        completed_at: new Date().toISOString(),
        logs: JSON.stringify(this.logs)
      })
      .eq('session_id', this.sessionId);

    if (error) {
      console.error('Failed to complete progress:', error);
    }
  }

  /**
   * 실패 처리
   */
  async fail(errorMessage: string): Promise<void> {
    this.logs.push(this.addTimestamp(`❌ 오류: ${errorMessage}`));

    const { error } = await supabaseAdmin
      .from('collection_progress')
      .update({
        status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString(),
        logs: JSON.stringify(this.logs)
      })
      .eq('session_id', this.sessionId);

    if (error) {
      console.error('Failed to mark progress as failed:', error);
    }
  }

  /**
   * 타임스탬프 추가
   */
  private addTimestamp(message: string): string {
    const now = new Date();
    const time = now.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    return `[${time}] ${message}`;
  }

  /**
   * 진행률 조회 (정적 메서드)
   */
  static async getProgress(sessionId: string): Promise<CollectionProgress | null> {
    const { data, error } = await supabaseAdmin
      .from('collection_progress')
      .select('*')
      .eq('session_id', sessionId)
      .single();

    if (error) {
      console.error('Failed to get progress:', error);
      return null;
    }

    // logs를 JSON에서 파싱
    if (data && typeof data.logs === 'string') {
      try {
        data.logs = JSON.parse(data.logs);
      } catch (e) {
        data.logs = [];
      }
    }

    return data as CollectionProgress;
  }

  /**
   * 최근 세션 목록 조회 (정적 메서드)
   */
  static async getRecentSessions(limit: number = 10): Promise<CollectionProgress[]> {
    const { data, error } = await supabaseAdmin
      .from('collection_progress')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get recent sessions:', error);
      return [];
    }

    // logs를 JSON에서 파싱
    return (data || []).map(item => {
      if (typeof item.logs === 'string') {
        try {
          item.logs = JSON.parse(item.logs);
        } catch (e) {
          item.logs = [];
        }
      }
      return item as CollectionProgress;
    });
  }

  /**
   * 세션 ID 생성 (정적 메서드)
   */
  static generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

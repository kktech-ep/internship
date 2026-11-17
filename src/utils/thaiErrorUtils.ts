/**
 * Translates raw Firebase/Firestore JSON errors, SDK codes, and network errors
 * into clear, human-friendly Thai error messages for UI alerts.
 */
export function formatThaiErrorMessage(
  error: unknown,
  fallback: string = 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล กรุณาลองใหม่อีกครั้ง'
): string {
  let raw = '';
  if (error instanceof Error) {
    raw = error.message || '';
  } else if (typeof error === 'string') {
    raw = error;
  } else if (error && typeof error === 'object' && 'message' in error) {
    raw = String((error as { message?: unknown }).message ?? '');
  } else if (error !== null && error !== undefined) {
    raw = String(error);
  }

  raw = raw.trim();
  if (!raw) return fallback;

  // Unwrap structured FirestoreErrorInfo JSON thrown by handleFirestoreError()
  let innerMessage = raw;
  if (raw.startsWith('{') && raw.includes('"error"')) {
    try {
      const parsed = JSON.parse(raw) as { error?: unknown };
      if (parsed && typeof parsed.error === 'string' && parsed.error.trim()) {
        innerMessage = parsed.error.trim();
      }
    } catch {
      // Keep raw string if JSON parsing fails
    }
  }

  const lower = innerMessage.toLowerCase();

  if (
    lower.includes('quota exceeded') ||
    lower.includes('free daily read units') ||
    lower.includes('resource-exhausted')
  ) {
    return 'เกินโควตาการใช้งานฐานข้อมูลประจำวันชั่วคราว ระบบจะรีเซ็ตโควตาในวันถัดไป กรุณาลองใหม่อีกครั้งภายหลัง';
  }

  if (
    lower.includes('missing or insufficient permissions') ||
    lower.includes('permission-denied') ||
    lower.includes('permission_denied')
  ) {
    return 'ไม่สามารถเข้าถึงหรือบันทึกข้อมูลได้ เนื่องจากข้อมูลไม่ผ่านเงื่อนไขความปลอดภัยหรือไม่มีสิทธิ์ในส่วนนี้';
  }

  if (
    lower.includes('the client is offline') ||
    lower.includes('offline') ||
    lower.includes('unavailable') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network error')
  ) {
    return 'ไม่สามารถเชื่อมต่ออินเทอร์เน็ตหรือฐานข้อมูลออนไลน์ได้ในขณะนี้ กรุณาตรวจสอบเครือข่ายแล้วลองใหม่อีกครั้ง';
  }

  if (
    lower.includes('exceeds the maximum allowed size') ||
    lower.includes('document too large') ||
    lower.includes('1048576')
  ) {
    return 'ขนาดข้อมูลหรือรูปภาพในรายงานใหญ่เกินกำหนด (เกิน 1 MB) กรุณาลดขนาดหรือจำนวนรูปภาพแล้วลองบันทึกใหม่';
  }

  if (
    lower.includes('unsupported field value') ||
    lower.includes('invalid-argument') ||
    lower.includes('invalid argument')
  ) {
    return 'ข้อมูลบางช่องมีรูปแบบไม่ถูกต้องหรือไม่ครบถ้วน กรุณาตรวจสอบข้อมูลแล้วลองบันทึกใหม่อีกครั้ง';
  }

  if (lower.includes('deadline-exceeded') || lower.includes('timeout') || lower.includes('timed out')) {
    return 'การเชื่อมต่อฐานข้อมูลใช้เวลานานเกินกำหนด กรุณาลองใหม่อีกครั้ง';
  }

  if (lower.includes('unauthenticated')) {
    return 'กรุณาเข้าสู่ระบบใหม่อีกครั้งเพื่อดำเนินการต่อ';
  }

  if (lower.includes('not-found') || lower.includes('no document to update')) {
    return 'ไม่พบข้อมูลเอกสารที่ต้องการในฐานข้อมูล';
  }

  if (lower.includes('already-exists')) {
    return 'มีข้อมูลรายการนี้อยู่ในฐานข้อมูลแล้ว';
  }

  if (lower.includes('aborted') || lower.includes('cancelled')) {
    return 'การทำรายการถูกยกเลิกชั่วคราว กรุณาลองใหม่อีกครั้ง';
  }

  // If the message already contains Thai text and is not a raw JSON dump, return it cleanly
  if (/[\u0E00-\u0E7F]/.test(innerMessage) && !innerMessage.startsWith('{')) {
    return innerMessage;
  }

  return fallback;
}

/**
 * Returns true if the error is caused by Firestore daily quota limits or temporary offline/network issues.
 */
export function isQuotaOrNetworkError(error: unknown): boolean {
  let raw = '';
  if (error instanceof Error) {
    raw = error.message || '';
  } else if (typeof error === 'string') {
    raw = error;
  } else if (error && typeof error === 'object' && 'message' in error) {
    raw = String((error as { message?: unknown }).message ?? '');
  }
  const lower = raw.toLowerCase();
  return (
    lower.includes('quota exceeded') ||
    lower.includes('free daily read units') ||
    lower.includes('resource-exhausted') ||
    lower.includes('the client is offline') ||
    lower.includes('offline') ||
    lower.includes('unavailable') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror') ||
    lower.includes('network error') ||
    lower.includes('เกินโควตา') ||
    lower.includes('ไม่สามารถเชื่อมต่ออินเทอร์เน็ต')
  );
}

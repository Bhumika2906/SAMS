let currentToken: string | null = null;
let currentCandidateData: any = null;

export function setActiveVerification(token: string, data: any) {
  currentToken = token;
  currentCandidateData = data;
}

export function getActiveVerification() {
  return {
    activeToken: currentToken,
    activeData: currentCandidateData,
  };
}

export function updateActiveVerificationData(updater: (prev: any) => any) {
  if (currentCandidateData) {
    currentCandidateData = updater(currentCandidateData);
  }
}

export function clearActiveVerification() {
  currentToken = null;
  currentCandidateData = null;
}

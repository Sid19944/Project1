class ExpressError extends Error {
  constructor(status, message = "Something Went Wrong") {
    super();
    this.status = status;
    this.message = message;
    // this.errors = errors;
    this.suceess = false;
  }
}

export { ExpressError };

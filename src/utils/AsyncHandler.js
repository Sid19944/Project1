// WrapAsync function that return a function
const AsyncHandler = (fn)=> {
    return Promise.resolve(fn(req,res,next)).catch((err)=>next(err))
}

export {AsyncHandler}
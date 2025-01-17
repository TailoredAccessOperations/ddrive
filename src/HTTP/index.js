const path = require('path')
const Fastify = require('fastify')
const FastifyStatic = require('@fastify/static')
const FastifyMultipart = require('@fastify/multipart')
const FastifyAuth = require('@fastify/auth')

const commonSchemas = require('./constants/commonSchemas')
const directoryRoutes = require('./routes/directory/routes')
const fileRoutes = require('./routes/file/routes')
const Auth = require('./services/auth')

module.exports = (dfs, opts) => {
    // Create fastify instance
    const fastify = Fastify({ logger: { base: undefined } })

    // Load common schemas
    commonSchemas.forEach((schema) => fastify.addSchema(schema))

    // Enable Multipart upload
    fastify.register(FastifyMultipart, { limits: { fileSize: Infinity } })

    // Load Auth and then register the routes
    fastify.decorate('basicAuth', Auth(opts.authOpts))
    fastify.register(FastifyAuth)
        .after(() => {
            fastify.register(FastifyStatic, { root: path.join(__dirname, 'static') })
            fastify.register(directoryRoutes, { prefix: '/api' })
            fastify.register(fileRoutes, { prefix: '/api' })
        })

    // Attach dfs to every req
    fastify.addHook('onRequest', async (req) => { req.dfs = dfs })

    // Setup Error handler
    fastify.setErrorHandler(function handler(error, request, reply) {
        if (error.statusCode > 500 || !error.statusCode) {
            this.log.error(error)
            error.statusCode = 500 // eslint-disable-line no-param-reassign
            error.message = 'Internal server error' // eslint-disable-line no-param-reassign
        }
        reply.status(error.statusCode).send({ message: error.message })
    })

    // Handle Not found handler
    fastify.setNotFoundHandler((request, reply) => {
        reply.status(404).send({ message: 'Not found' })
    })

    return fastify
}

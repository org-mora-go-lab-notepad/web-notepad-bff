import { withGateway } from "@/src/server";

import { changeGroupAccess } from "../_lib/access-request";

const handlePOST = (request: Request) => changeGroupAccess(request, "revoke");

export const POST = withGateway(handlePOST);

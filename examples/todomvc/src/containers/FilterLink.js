import Link from "../components/Link";
import { withEventFlux } from "react-event-flux";

const eventFluxArgs = {
  todoStore: state => ({ activeFilter: state.filter })
};

export default withEventFlux(eventFluxArgs)(Link);

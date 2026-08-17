// deps

    // externals
    import React from "react";
    import {
        Modal, ModalBody, ModalFooter,
        List, ListItem,
        Button, ButtonGroup, Alert
    } from "react-bootstrap-fontawesome";

    // locals
    import getSDK from "../SDK";

// types & interfaces

    // externals
    import type { iPropsNode } from "react-bootstrap-fontawesome";

    // locals
    import type { operations } from "../Descriptor";

    type TokenRow = operations["getUserTokens"]["responses"]["200"]["content"]["application/json"][number];

    interface iProps extends iPropsNode {
        "userName": string;
        "onClose": (e?: React.MouseEvent<HTMLButtonElement>) => void;
        "onError": (err: Error) => void;
    }

    interface iState {
        "loading": boolean;
        "running": boolean;
        "tokens": TokenRow[];
    }

// component

export default class UserTokensModal extends React.Component<iProps, iState> {

    // name

        public static displayName: string = "UserTokensModal";

    // constructor

    public constructor (props: iProps) {

        super(props);

        this.state = {
            "loading": true,
            "running": false,
            "tokens": []
        };

    }

    public componentDidMount (): void {

        this._loadTokens();

    }

    // private

    private _loadTokens (): void {

        this.setState({
            "loading": true
        });

        getSDK().getUserTokens(this.props.userName).then((tokens: TokenRow[]): void => {

            this.setState({
                "loading": false,
                "tokens": tokens
            });

        }).catch((err: Error): void => {

            this.props.onError(err);
            this.setState({
                "loading": false
            });

        });

    }

    // interface handlers

    private readonly _handleDeleteToken = (token: string): (e: React.MouseEvent<HTMLButtonElement>) => void => {

        return (e: React.MouseEvent<HTMLButtonElement>): void => {

            e.preventDefault();
            e.stopPropagation();

            if (this.state.running) {
                return;
            }

            this.setState({
                "running": true
            });

            getSDK().deleteToken({
                "token": token
            }).then((): void => {

                this.setState({
                    "running": false,
                    "tokens": this.state.tokens.filter((row: TokenRow): boolean => {
                        return row.token !== token;
                    })
                });

            }).catch((err: Error): void => {

                this.props.onError(err);
                this.setState({
                    "running": false
                });

            });

        };

    };

    // render

    public render (): React.JSX.Element {

        return <Modal appId="{{plugin.name}}-app" title={ "Tokens — " + this.props.userName } centered
            onClose={ this.props.onClose }>

            <ModalBody>

                { this.state.loading && <Alert variant="info">Loading tokens...</Alert> }

                { !this.state.loading && !this.state.tokens.length && <Alert variant="secondary">No tokens</Alert> }

                { !this.state.loading && Boolean(this.state.tokens.length) && <List>

                    { this.state.tokens.map((row: TokenRow): React.JSX.Element => {

                        return <ListItem key={ row.token } justify>

                            <span>
                                <code>{ row.fingerprint || row.token.slice(0, 12) + "…" }</code>
                                { " · " + new Date(row.createdAt).toLocaleString() }
                            </span>

                            <ButtonGroup>
                                <Button title="Delete token" icon="trash" variant="danger" outline size="sm"
                                    disabled={ this.state.running }
                                    onClick={ this._handleDeleteToken(row.token) }
                                />
                            </ButtonGroup>

                        </ListItem>;

                    }) }

                </List> }

            </ModalBody>

            <ModalFooter>

                <Button type="button" variant="secondary" outline onClick={ this.props.onClose }>
                    Close
                </Button>

            </ModalFooter>

        </Modal>;

    }

}
